#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');

const { parseEnv } = require('./lib/parse-env-file.cjs');
const { writeFileAtomic } = require('./lib/write-file-atomic.cjs');
const { IOS_PROJECT_NAME, VARIANT_ENV_FILES } = require('./lib/variant-config.cjs');

/** Path to the Xcode project, derived rather than restated in two places. */
const IOS_PBXPROJ = `ios/${IOS_PROJECT_NAME}.xcodeproj/project.pbxproj`;

const readVariantEnv = (variantName) => {
    const envPath = path.join(projectRoot, VARIANT_ENV_FILES[variantName]);

    if (!fs.existsSync(envPath)) {
        return {};
    }

    return parseEnv(fs.readFileSync(envPath, 'utf8'));
};

const escapeSingleQuotedGradle = (value) => String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

const escapeXml = (value) =>
    String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

const formatXcodeValue = (value) => {
    const nextValue = String(value).replace(/"/g, '\\"');

    if (/^[A-Za-z0-9_.-]+$/.test(nextValue)) {
        return nextValue;
    }

    return `"${nextValue}"`;
};

const getDisplayNames = () =>
    Object.fromEntries(
        Object.keys(VARIANT_ENV_FILES).map((variantName) => {
            const env = readVariantEnv(variantName);
            return [variantName, env.APP_NAME || variantName];
        })
    );

/**
 * Refuses to run when the env files and the native project disagree about versions.
 *
 * This script syncs `APP_NAME` and nothing else, while `VERSION_NAME`/`VERSION_CODE`
 * reach native only through `expo prebuild`. So bumping `VERSION_NAME` and running
 * `pnpm ios:prod` produced a binary carrying the *old* `MARKETING_VERSION` — and because
 * `app.config.ts` sets `runtimeVersion: versionName`, the OTA update published
 * afterwards targeted a runtime version no installed binary had. The update simply never
 * applied, with a successful publish and nothing anywhere to explain it.
 *
 * Detecting and refusing is deliberate rather than extending this script to write the
 * version fields too. Writing them would put more env-derived values from a developer's
 * private `.env` into git-tracked native files, which is an open question on this
 * project, not a decision this script should make on its own. Silence was the defect;
 * either fixing it or refusing loudly resolves it, and refusing adds no new writes.
 */
/**
 * Returns the body of the brace-delimited block that `header` opens, or null.
 *
 * Counts braces rather than matching a closing one with a regex. A non-greedy
 * `[\s\S]*?\}` stops at the FIRST closing brace, which is an inner one as soon as the
 * block contains anything nested — `ndk { … }`, `javaCompileOptions { … }`,
 * `externalNativeBuild { cmake { … } }` are all routine in a flavor. The captured body
 * would then end early, the version fields would read as absent, and drift would be
 * reported as clean. Silent, and permanently so.
 *
 * @param contents text to search
 * @param header a regex matching the opening line; must be anchored enough to be unique
 * @param from index to start searching at, so callers can scope the search
 */
const extractBlockBody = (contents, header, from = 0) => {
    header.lastIndex = from;
    const match = header.exec(contents);

    if (!match) {
        return null;
    }

    const open = contents.indexOf('{', match.index);
    if (open === -1) {
        return null;
    }

    let depth = 0;

    for (let i = open; i < contents.length; i += 1) {
        if (contents[i] === '{') depth += 1;
        else if (contents[i] === '}') {
            depth -= 1;
            if (depth === 0) {
                return contents.slice(open + 1, i);
            }
        }
    }

    return null;
};

/** The `productFlavors { … }` region, so a same-named block elsewhere cannot be mistaken for a flavor. */
const extractProductFlavors = (gradle) => extractBlockBody(gradle, /\bproductFlavors\s*\{/g);

const findVersionDrift = () => {
    const gradlePath = path.join(projectRoot, 'android/app/build.gradle');
    const pbxprojPath = path.join(projectRoot, IOS_PBXPROJ);

    const hasAndroid = fs.existsSync(gradlePath);
    const hasIos = fs.existsSync(pbxprojPath);

    // Returning "no drift" here would be indistinguishable from "checked and clean", which
    // is the silence this whole check exists to remove. A tree with neither native project
    // has not been prebuilt, and building from it is not something to wave through.
    if (!hasAndroid && !hasIos) {
        return ['no native project found — run `pnpm prebuild` before syncing'];
    }

    const flavors = hasAndroid ? extractProductFlavors(fs.readFileSync(gradlePath, 'utf8')) : null;
    const pbxproj = hasIos ? fs.readFileSync(pbxprojPath, 'utf8') : null;
    const drift = [];

    if (hasAndroid && flavors === null) {
        drift.push('android/app/build.gradle — could not locate the productFlavors block');
    }

    for (const variantName of Object.keys(VARIANT_ENV_FILES)) {
        const env = readVariantEnv(variantName);

        // `!= null` rather than truthiness: VERSION_CODE=0 is a legitimate value.
        const wantName = env.VERSION_NAME != null && env.VERSION_NAME !== '' ? env.VERSION_NAME : null;
        const wantCode = env.VERSION_CODE != null && env.VERSION_CODE !== '' ? env.VERSION_CODE : null;

        if (wantName === null && wantCode === null) {
            continue;
        }

        if (flavors !== null) {
            const body = extractBlockBody(flavors, new RegExp(`(^|\\n)\\s*${variantName}\\s*\\{`, 'g'));

            if (body === null) {
                drift.push(`${variantName}: no productFlavors block found in android/app/build.gradle`);
            } else {
                const nativeName = body.match(/versionName\s+['"]([^'"]*)['"]/)?.[1];
                const nativeCode = body.match(/versionCode\s+(\d+)/)?.[1];

                // Reported rather than skipped. A flavor that stopped emitting these would
                // otherwise turn the check into a permanent no-op with nothing to show for it.
                if (wantName !== null && nativeName === undefined) {
                    drift.push(`${variantName}: could not read versionName from android/app/build.gradle`);
                } else if (wantName !== null && wantName !== nativeName) {
                    drift.push(`${variantName}: VERSION_NAME is "${wantName}" but native has "${nativeName}"`);
                }

                if (wantCode !== null && nativeCode === undefined) {
                    drift.push(`${variantName}: could not read versionCode from android/app/build.gradle`);
                } else if (wantCode !== null && wantCode !== nativeCode) {
                    drift.push(`${variantName}: VERSION_CODE is "${wantCode}" but native has "${nativeCode}"`);
                }
            }
        }

        // iOS carries the version that actually ships in MARKETING_VERSION. Checking Android
        // alone left a Mac-only contributor on a tree with no android/ completely uncovered:
        // sync exits 0, the binary ships the old version, and the OTA never applies.
        if (pbxproj !== null && wantName !== null) {
            const section = pbxproj
                .split(/(\n\t\t\};)/)
                .find((part) => part.includes(`APP_VARIANT = ${variantName};`));

            const marketingVersion = section?.match(/MARKETING_VERSION = ([^;]+);/)?.[1]?.trim();

            if (marketingVersion !== undefined && marketingVersion !== wantName) {
                drift.push(`${variantName}: VERSION_NAME is "${wantName}" but iOS has "${marketingVersion}"`);
            }
        }
    }

    return drift;
};

/**
 * Anchors that never match are the failure mode this script is built to avoid.
 *
 * `String.replace` returns its input unchanged when nothing matched, so a drifted
 * anchor and a successful sync are indistinguishable from the outside. This tracks
 * both facts separately: whether the anchor was found at all, and whether the value
 * actually changed. A value that is already correct is a legitimate no-op; a missing
 * anchor means the native project is not in the shape this script assumes.
 */
const missingAnchors = [];
const changes = [];

const applyAnchored = ({ contents, pattern, replacement, file, description }) => {
    if (!pattern.test(contents)) {
        missingAnchors.push(`${file} — ${description}`);
        return contents;
    }

    const next = contents.replace(pattern, replacement);
    if (next !== contents) {
        changes.push(`${file} — ${description}`);
    }

    return next;
};

const replaceGradleFlavorAppName = (contents, variantName, displayName) => {
    const escapedDisplayName = escapeSingleQuotedGradle(displayName);
    const flavorPattern = new RegExp(
        `(${variantName}\\s*\\{[\\s\\S]*?resValue\\s+'string',\\s+'app_name',\\s+')[^']*(')`
    );

    return applyAnchored({
        contents,
        pattern: flavorPattern,
        replacement: `$1${escapedDisplayName}$2`,
        file: 'android/app/build.gradle',
        description: `${variantName} flavor app_name`,
    });
};

const syncAndroidDisplayNames = (displayNames) => {
    const buildGradlePath = path.join(projectRoot, 'android/app/build.gradle');
    if (fs.existsSync(buildGradlePath)) {
        let contents = fs.readFileSync(buildGradlePath, 'utf8');

        for (const [variantName, displayName] of Object.entries(displayNames)) {
            contents = replaceGradleFlavorAppName(contents, variantName, displayName);
        }

        writeFileAtomic(buildGradlePath, contents);
    }

    const stringsPath = path.join(projectRoot, 'android/app/src/main/res/values/strings.xml');
    if (fs.existsSync(stringsPath)) {
        const developmentDisplayName = displayNames.development;
        const contents = applyAnchored({
            contents: fs.readFileSync(stringsPath, 'utf8'),
            pattern: /<string name="app_name">[^<]*<\/string>/,
            replacement: `<string name="app_name">${escapeXml(developmentDisplayName)}</string>`,
            file: 'android/app/src/main/res/values/strings.xml',
            description: 'app_name string',
        });

        writeFileAtomic(stringsPath, contents);
    }
};

const replaceXcodeConfigAppName = (contents, variantName, displayName) => {
    const formattedDisplayName = formatXcodeValue(displayName);
    let matchedSection = false;

    const next = contents
        .split(/(\n\t\t\};)/)
        .map((section) => {
            if (!section.includes(`APP_VARIANT = ${variantName};`)) {
                return section;
            }

            matchedSection = true;
            return section.replace(/APP_DISPLAY_NAME = .*?;/, `APP_DISPLAY_NAME = ${formattedDisplayName};`);
        })
        .join('');

    const file = IOS_PBXPROJ;
    if (!matchedSection) {
        missingAnchors.push(`${file} — no build configuration declares APP_VARIANT = ${variantName}`);
    } else if (next !== contents) {
        changes.push(`${file} — ${variantName} APP_DISPLAY_NAME`);
    }

    return next;
};

const syncIosDisplayNames = (displayNames) => {
    const pbxprojPath = path.join(projectRoot, IOS_PBXPROJ);

    if (!fs.existsSync(pbxprojPath)) {
        return;
    }

    let contents = fs.readFileSync(pbxprojPath, 'utf8');

    for (const [variantName, displayName] of Object.entries(displayNames)) {
        contents = replaceXcodeConfigAppName(contents, variantName, displayName);
    }

    writeFileAtomic(pbxprojPath, contents);
};

// Before any write: an assert firing mid-run would otherwise leave earlier mutations
// applied to tracked native files.
const versionDrift = findVersionDrift();

if (versionDrift.length > 0) {
    console.error('❌ Environment and native project disagree about versions:');
    for (const entry of versionDrift) {
        console.error(`   • ${entry}`);
    }
    console.error('');
    console.error('This script syncs APP_NAME only — version fields reach native through prebuild.');
    console.error('Building now would ship the native version while the OTA runtimeVersion follows');
    console.error('the env file, so the update targets a runtime version no binary has and never');
    console.error('applies. Run `pnpm prebuild` to regenerate native, then retry.');
    process.exit(1);
}

const displayNames = getDisplayNames();

syncAndroidDisplayNames(displayNames);
syncIosDisplayNames(displayNames);

// Report what actually happened, per file. The previous unconditional success line
// printed "✅ Synced" even when every anchor had missed and nothing was written.
if (missingAnchors.length > 0) {
    console.error('❌ Native sync could not find these anchors:');
    for (const anchor of missingAnchors) {
        console.error(`   • ${anchor}`);
    }
    console.error('');
    console.error('The native project is not in the shape this script expects — usually because');
    console.error('`expo prebuild` has not run, or a template update reformatted the anchor.');
    console.error('Run `pnpm prebuild` and retry. If it still fails, update the anchors in');
    console.error('scripts/sync-native-env.cjs.');
    process.exit(1);
}

if (changes.length === 0) {
    console.log('✅ Native APP_NAME values already up to date, nothing to write.');
} else {
    console.log('✅ Synced native APP_NAME values:');
    for (const change of changes) {
        console.log(`   • ${change}`);
    }
}
