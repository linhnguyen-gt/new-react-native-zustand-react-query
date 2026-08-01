const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { VARIANTS, VARIANT_ENV_FILES, getAndroidAppId, IOS_PROJECT_NAME } = require('../lib/variant-config.cjs');
const { writeFileAtomic } = require('../lib/write-file-atomic.cjs');

const PROJECT_ROOT = path.join(__dirname, '..', '..');

describe('the shared variant table', () => {
    it('derives the Android launch id from the package name rather than restating it', () => {
        // run-native.cjs passes this to `expo run:android --app-id`, which is what starts
        // the installed package. When it was a separate literal, changing the package name
        // in app.config.ts left the launcher asking for the old id: the app built,
        // installed, and then failed to start with an error pointing at the device.
        for (const [name, variant] of Object.entries(VARIANTS)) {
            expect(getAndroidAppId(name)).toBe(variant.packageName);
        }
    });

    it('covers exactly the three variants every consumer knows about', () => {
        expect(Object.keys(VARIANTS).sort()).toEqual(['development', 'production', 'staging']);
        expect(Object.keys(VARIANT_ENV_FILES).sort()).toEqual(Object.keys(VARIANTS).sort());
    });

    it('points each iOS scheme at a scheme that exists on disk', () => {
        const schemesDir = path.join(PROJECT_ROOT, 'ios', `${IOS_PROJECT_NAME}.xcodeproj`, 'xcshareddata', 'xcschemes');

        // Asserted, not guarded. All three .xcscheme files are tracked, so a missing
        // directory means the checkout is wrong — silently passing would turn a real
        // failure green the day ios/ becomes gitignored.
        expect(fs.existsSync(schemesDir)).toBe(true);

        const present = fs.readdirSync(schemesDir).map((file) => file.replace('.xcscheme', ''));

        // development deliberately maps onto the stock scheme: the iOS plugin skips the
        // default variant when generating per-variant schemes, so no Development.xcscheme
        // exists and pointing at one would fail at build time.
        for (const variant of Object.values(VARIANTS)) {
            expect(present).toContain(variant.iosScheme);
        }
    });

    it('gives every variant a build configuration the Xcode project declares', () => {
        const pbxproj = path.join(PROJECT_ROOT, 'ios', `${IOS_PROJECT_NAME}.xcodeproj`, 'project.pbxproj');

        expect(fs.existsSync(pbxproj)).toBe(true);

        const contents = fs.readFileSync(pbxproj, 'utf8');
        const declared = [...contents.matchAll(/name = "?([A-Za-z.]+)"?;/g)].map((match) => match[1]);

        // Matched as a declared configuration name, not as a substring. A bare
        // `toContain('Debug')` passes against any Xcode project ever written, so it
        // asserted nothing for the development variant.
        for (const variant of Object.values(VARIANTS)) {
            expect(declared).toContain(variant.iosConfiguration);
        }
    });

    it('matches the package names the committed Gradle flavors declare', () => {
        const gradle = path.join(PROJECT_ROOT, 'android', 'app', 'build.gradle');

        expect(fs.existsSync(gradle)).toBe(true);

        const contents = fs.readFileSync(gradle, 'utf8');

        // The table and the committed native project are two sources that can drift; this
        // is what turns that drift red instead of silent.
        for (const variant of Object.values(VARIANTS)) {
            expect(contents).toContain(`applicationId '${variant.packageName}'`);
        }
    });
});

describe('signing identity stays out of the template', () => {
    /**
     * This template ships no Apple Team ID, so every developer selects their own in Xcode.
     * Nothing enforces that by itself, and the tooling actively works against it.
     *
     * The concrete failure: build to a physical device through `pnpm ios` with no team
     * configured and Expo configures signing for you. It writes `DEVELOPMENT_TEAM` into
     * `project.pbxproj`, and with more than one signing identity available it also writes
     * `ios.appleTeamId` back into `app.json`. Both files are tracked, both edits look like
     * incidental native churn in a diff, and committing either publishes one developer's
     * Apple Team ID to everyone who clones the template. That is how it got in here the
     * first time.
     */
    it('has no development team in the committed Xcode project', () => {
        const pbxproj = path.join(PROJECT_ROOT, 'ios', `${IOS_PROJECT_NAME}.xcodeproj`, 'project.pbxproj');

        expect(fs.existsSync(pbxproj)).toBe(true);

        expect(fs.readFileSync(pbxproj, 'utf8')).not.toMatch(/DEVELOPMENT_TEAM/);
    });

    it('has no appleTeamId in app.json', () => {
        // app.json is the other half: `withDevelopmentTeam` re-applies whatever it finds
        // here on every prebuild, so a value that lands in this file survives even
        // `prebuild:clean` and quietly reinstates itself in the native project.
        const appJson = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'app.json'), 'utf8'));

        expect(appJson.ios?.appleTeamId).toBeUndefined();
    });
});

describe('version drift detection', () => {
    /**
     * A synthetic build.gradle, deliberately not the repo's.
     *
     * The first version of these tests copied the real `android/app/build.gradle` and the
     * real `.env*` files — but `.env*` is gitignored, so on CI none exist, every variant
     * had nothing to compare, and the drift assertions failed while the "agrees" test
     * passed vacuously. It also meant a developer whose own `.env` legitimately drifted
     * saw a red suite for the right reason at the wrong time.
     *
     * The logic under test is pure text handling, so a fixture is both sufficient and
     * stable. `ndk { … }` is present on purpose: a non-greedy regex terminates at its
     * closing brace and reads the version fields as absent, silently reporting clean.
     */
    const GRADLE = `
android {
    signingConfigs {
        production {
            storeFile file('release.keystore')
        }
    }

    productFlavors {
        development {
            dimension 'environment'
            applicationId 'com.example.dev'
            versionCode 1
            versionName '1.0.0'
            resValue 'string', 'app_name', 'Dev'
        }

        staging {
            dimension 'environment'
            applicationId 'com.example.stg'
            versionCode 1
            versionName '1.0.0'
            resValue 'string', 'app_name', 'Staging'
        }

        production {
            dimension 'environment'
            applicationId 'com.example'
            ndk {
                abiFilters 'armeabi-v7a', 'arm64-v8a'
            }
            versionCode 2
            versionName '1.0.0'
            resValue 'string', 'app_name', 'Product'
        }
    }
}
`;

    const envFor = (over = {}) => ({
        APP_NAME: 'Example',
        VERSION_NAME: '1.0.0',
        VERSION_CODE: '1',
        ...over,
    });

    /** Runs the real script against a scratch project built entirely from fixtures. */
    const runSync = (perVariantEnv = {}, gradle = GRADLE) => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-native-'));

        try {
            fs.cpSync(path.join(PROJECT_ROOT, 'scripts'), path.join(dir, 'scripts'), { recursive: true });
            fs.mkdirSync(path.join(dir, 'android', 'app'), { recursive: true });
            fs.writeFileSync(path.join(dir, 'android', 'app', 'build.gradle'), gradle);

            const defaults = { development: {}, staging: {}, production: { VERSION_CODE: '2' } };

            for (const [variant, file] of Object.entries(VARIANT_ENV_FILES)) {
                const env = envFor({ ...defaults[variant], ...(perVariantEnv[variant] ?? {}) });
                const body = Object.entries(env)
                    .map(([key, value]) => `${key}=${value}`)
                    .join('\n');
                fs.writeFileSync(path.join(dir, file), `${body}\n`);
            }

            execFileSync('node', [path.join(dir, 'scripts', 'sync-native-env.cjs')], { cwd: dir, stdio: 'pipe' });
            return { code: 0, output: '' };
        } catch (error) {
            return { code: error.status ?? 1, output: String(error.stderr ?? '') + String(error.stdout ?? '') };
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    };

    it('passes when the env files and native agree', () => {
        expect(runSync()).toEqual({ code: 0, output: '' });
    });

    it('refuses when VERSION_NAME has drifted', () => {
        // The failure this prevents: the binary ships the native MARKETING_VERSION while
        // app.config.ts derives runtimeVersion from the env file, so the OTA update
        // afterwards targets a runtime version no installed binary has. The publish
        // succeeds and the update simply never applies.
        const result = runSync({ production: { VERSION_NAME: '9.9.9' } });

        expect(result.code).toBe(1);
        expect(result.output).toMatch(/production: VERSION_NAME is "9\.9\.9" but native has "1\.0\.0"/);
        expect(result.output).toMatch(/prebuild/);
    });

    it('refuses when VERSION_CODE has drifted', () => {
        const result = runSync({ staging: { VERSION_CODE: '77' } });

        expect(result.code).toBe(1);
        expect(result.output).toMatch(/staging: VERSION_CODE is "77" but native has "1"/);
    });

    it('sees past a nested block inside the flavor', () => {
        // The production flavor in the fixture contains `ndk { … }` before its version
        // fields. A non-greedy brace match ends there, reads both versions as absent, and
        // reports clean — the check would be permanently decorative and never say so.
        const result = runSync({ production: { VERSION_CODE: '55' } });

        expect(result.code).toBe(1);
        expect(result.output).toMatch(/production: VERSION_CODE is "55" but native has "2"/);
    });

    it('is not fooled by a same-named block outside productFlavors', () => {
        // `signingConfigs { production { … } }` appears first in the fixture and has no
        // version fields. Matching it instead of the flavor would report "could not read"
        // or nothing at all rather than the real mismatch.
        const result = runSync({ production: { VERSION_NAME: '3.0.0' } });

        expect(result.output).toMatch(/production: VERSION_NAME is "3\.0\.0" but native has "1\.0\.0"/);
    });

    it('reports rather than skips when a flavor stops declaring its versions', () => {
        const stripped = GRADLE.replace(/\n\s*versionCode 2\n\s*versionName '1\.0\.0'/, '');

        const result = runSync({}, stripped);

        expect(result.code).toBe(1);
        expect(result.output).toMatch(/could not read version(Name|Code)/);
    });

    it('refuses when there is no native project at all', () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-native-'));

        try {
            fs.cpSync(path.join(PROJECT_ROOT, 'scripts'), path.join(dir, 'scripts'), { recursive: true });
            fs.writeFileSync(path.join(dir, '.env'), 'APP_NAME=Example\nVERSION_NAME=1.0.0\n');

            let code = 0;
            let output = '';
            try {
                execFileSync('node', [path.join(dir, 'scripts', 'sync-native-env.cjs')], { cwd: dir, stdio: 'pipe' });
            } catch (error) {
                code = error.status ?? 1;
                output = String(error.stderr ?? '');
            }

            // Silence here is indistinguishable from "checked and clean", which is the
            // whole failure mode this check exists to remove.
            expect(code).toBe(1);
            expect(output).toMatch(/no native project/);
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });

    it('checks before writing, so a refusal leaves native untouched', () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-native-'));

        try {
            fs.cpSync(path.join(PROJECT_ROOT, 'scripts'), path.join(dir, 'scripts'), { recursive: true });
            fs.mkdirSync(path.join(dir, 'android', 'app'), { recursive: true });

            const gradlePath = path.join(dir, 'android', 'app', 'build.gradle');
            fs.writeFileSync(gradlePath, GRADLE);
            const before = fs.readFileSync(gradlePath, 'utf8');

            // A name change that WOULD be written, paired with a version that must abort.
            fs.writeFileSync(path.join(dir, '.env'), 'APP_NAME=Renamed\nVERSION_NAME=9.9.9\nVERSION_CODE=1\n');

            try {
                execFileSync('node', [path.join(dir, 'scripts', 'sync-native-env.cjs')], { cwd: dir, stdio: 'pipe' });
            } catch {
                /* expected */
            }

            // An abort partway through would leave tracked native files half-mutated.
            expect(fs.readFileSync(gradlePath, 'utf8')).toBe(before);
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });
});

describe('atomic writes', () => {
    it('replaces the file in one step and leaves no temp file behind', () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atomic-'));

        try {
            const target = path.join(dir, 'build.gradle');
            fs.writeFileSync(target, 'original');

            writeFileAtomic(target, 'replaced');

            expect(fs.readFileSync(target, 'utf8')).toBe('replaced');
            expect(fs.readdirSync(dir)).toEqual(['build.gradle']);
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });

    it('leaves the original intact and cleans up when the write fails', () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atomic-'));

        try {
            const target = path.join(dir, 'project.pbxproj');
            fs.writeFileSync(target, 'original');

            // A circular structure that JSON-free writeFileSync still rejects on type.
            expect(() => writeFileAtomic(target, undefined)).toThrow();

            expect(fs.readFileSync(target, 'utf8')).toBe('original');
            // A stray temp file next to a tracked file shows up in every later git status.
            expect(fs.readdirSync(dir)).toEqual(['project.pbxproj']);
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });

    it('keeps the temp file on the same filesystem as the target', () => {
        // rename is atomic only within a filesystem. A temp file in os.tmpdir() could land
        // on a different volume and silently degrade to a copy, reintroducing the partial
        // write this exists to prevent.
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atomic-'));

        try {
            const target = path.join(dir, 'strings.xml');
            const seen = [];
            const realWrite = fs.writeFileSync;
            jest.spyOn(fs, 'writeFileSync').mockImplementation((file, ...rest) => {
                seen.push(String(file));
                return realWrite(file, ...rest);
            });

            writeFileAtomic(target, 'contents');

            expect(path.dirname(seen[0])).toBe(dir);
        } finally {
            jest.restoreAllMocks();
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });
});
