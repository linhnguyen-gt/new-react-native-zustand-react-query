#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');

const variants = {
    development: {
        envFile: '.env',
    },
    staging: {
        envFile: '.env.staging',
    },
    production: {
        envFile: '.env.production',
    },
};

const { parseEnv } = require('./lib/parse-env-file.cjs');

const readVariantEnv = (variantName) => {
    const envPath = path.join(projectRoot, variants[variantName].envFile);

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
        Object.keys(variants).map((variantName) => {
            const env = readVariantEnv(variantName);
            return [variantName, env.APP_NAME || variantName];
        })
    );

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

        fs.writeFileSync(buildGradlePath, contents);
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

        fs.writeFileSync(stringsPath, contents);
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

    const file = 'ios/NewReactNativeZustandRNQ.xcodeproj/project.pbxproj';
    if (!matchedSection) {
        missingAnchors.push(`${file} — no build configuration declares APP_VARIANT = ${variantName}`);
    } else if (next !== contents) {
        changes.push(`${file} — ${variantName} APP_DISPLAY_NAME`);
    }

    return next;
};

const syncIosDisplayNames = (displayNames) => {
    const xcodeProjectRoot = path.join(projectRoot, 'ios/NewReactNativeZustandRNQ.xcodeproj');
    const pbxprojPath = path.join(xcodeProjectRoot, 'project.pbxproj');

    if (!fs.existsSync(pbxprojPath)) {
        return;
    }

    let contents = fs.readFileSync(pbxprojPath, 'utf8');

    for (const [variantName, displayName] of Object.entries(displayNames)) {
        contents = replaceXcodeConfigAppName(contents, variantName, displayName);
    }

    fs.writeFileSync(pbxprojPath, contents);
};

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
