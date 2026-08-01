/**
 * The per-variant table the whole native generation is derived from.
 *
 * It used to be assembled in `app.config.ts` and handed over through
 * `config.extra.nativeVariants` — which published build-time data into the runtime
 * manifest of every shipped binary. The plugin reads the env files itself now.
 *
 * That move must be value-identical: the Gradle product flavors, the Xcode schemes and,
 * critically, the per-variant `.env` selection are all built from these fields. A wrong
 * value does not fail the build — it produces a green build carrying another variant's
 * configuration, which is the same failure class the anchored-mutation tests guard.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const { internal } = require('../with-environment-support.cjs');

const { getNativeVariants } = internal;

/** A config shaped like what Expo hands a plugin, minus everything unused here. */
const makeConfig = (projectRoot) => ({
    name: 'FallbackName',
    version: '9.9.9',
    ios: { bundleIdentifier: 'fallback.ios' },
    android: { package: 'fallback.android', versionCode: 99 },
    extra: { appDisplayName: 'FallbackDisplay' },
    _internal: { projectRoot },
});

describe('getNativeVariants', () => {
    let projectRoot;
    let originalEnv;

    beforeEach(() => {
        projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'variant-table-'));
        originalEnv = { ...process.env };
        delete process.env.APP_VARIANT;
        delete process.env.APP_FLAVOR;
        delete process.env.APP_NAME;
        delete process.env.VERSION_NAME;
        delete process.env.VERSION_CODE;
        delete process.env.EXPO_UPDATE_CHANNEL;
    });

    afterEach(() => {
        process.env = originalEnv;
        fs.rmSync(projectRoot, { recursive: true, force: true });
    });

    const write = (file, contents) => fs.writeFileSync(path.join(projectRoot, file), contents);

    it('covers all three variants with their static identifiers', () => {
        const variants = getNativeVariants(makeConfig(projectRoot));

        expect(variants.map((v) => v.name)).toEqual(['development', 'staging', 'production']);

        const byName = Object.fromEntries(variants.map((v) => [v.name, v]));
        expect(byName.development.packageName).toBe('com.newreactnativezustandrnq.dev');
        expect(byName.staging.packageName).toBe('com.newreactnativezustandrnq.stg');
        expect(byName.production.packageName).toBe('com.newreactnativezustandrnq');
        expect(byName.staging.iosScheme ?? byName.staging.scheme).toBe('Staging');
    });

    it('maps each variant to its own env file', () => {
        const variants = getNativeVariants(makeConfig(projectRoot));
        const byName = Object.fromEntries(variants.map((v) => [v.name, v]));

        // This field selects which .env the native build embeds. Getting it wrong is the
        // silent-wrong-config failure.
        expect(byName.development.envFile).toBe('.env');
        expect(byName.staging.envFile).toBe('.env.staging');
        expect(byName.production.envFile).toBe('.env.production');
    });

    it('reads each variant from its own file, not from the selected one', () => {
        write('.env', 'APP_NAME=DevApp\nVERSION_NAME=1.0.0\n');
        write('.env.staging', 'APP_NAME=StgApp\nVERSION_NAME=2.0.0\n');
        write('.env.production', 'APP_NAME=ProdApp\nVERSION_NAME=3.0.0\n');

        const byName = Object.fromEntries(getNativeVariants(makeConfig(projectRoot)).map((v) => [v.name, v]));

        expect(byName.development.displayName).toBe('DevApp');
        expect(byName.staging.displayName).toBe('StgApp');
        expect(byName.production.displayName).toBe('ProdApp');
        expect(byName.staging.versionName).toBe('2.0.0');
    });

    it('lets the process env win, but only for the selected variant', () => {
        write('.env', 'APP_NAME=DevApp\n');
        write('.env.staging', 'APP_NAME=StgApp\n');

        process.env.APP_VARIANT = 'staging';
        process.env.APP_NAME = 'InjectedByEasEnvExec';

        const byName = Object.fromEntries(getNativeVariants(makeConfig(projectRoot)).map((v) => [v.name, v]));

        // `eas env:exec` and the shell win for the variant being built…
        expect(byName.staging.displayName).toBe('InjectedByEasEnvExec');
        // …and must not bleed into the other variants' generated config.
        expect(byName.development.displayName).toBe('DevApp');
    });

    it('falls back to config values when no env file exists', () => {
        // `expo prebuild` can legitimately run with no env files present. The generated
        // flavors and schemes must still come out complete rather than with empty names.
        const byName = Object.fromEntries(getNativeVariants(makeConfig(projectRoot)).map((v) => [v.name, v]));

        expect(byName.production.displayName).toBe('FallbackDisplay');
        expect(byName.production.versionName).toBe('9.9.9');
        expect(byName.production.versionCode).toBe(99);
        expect(byName.production.updateChannel).toBe('production');
    });

    it('defaults the update channel per variant', () => {
        const byName = Object.fromEntries(getNativeVariants(makeConfig(projectRoot)).map((v) => [v.name, v]));

        expect(byName.development.updateChannel).toBe('development');
        expect(byName.staging.updateChannel).toBe('staging');
        expect(byName.production.updateChannel).toBe('production');
    });
});
