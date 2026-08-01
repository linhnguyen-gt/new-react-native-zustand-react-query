/**
 * `eas.json` restates values that `variant-config.cjs` already owns.
 *
 * It has to: eas.json is static JSON that cannot import the table. So the drift this repo
 * removed everywhere else is reintroduced here by the file format, and the only defence is
 * a test that fails when the two disagree.
 *
 * What drift costs: `eas build --profile staging` with a stale `gradleCommand` builds the
 * wrong flavor and the build still succeeds. A wrong `environment` pulls another
 * environment's variables. A wrong `channel` ships updates that no installed binary
 * subscribes to — the publish reports success and nobody receives anything.
 */

const fs = require('fs');
const path = require('path');

const { VARIANTS, VARIANT_EAS_ENVIRONMENTS } = require('../variant-config.cjs');

const easJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../eas.json'), 'utf8'));

/** `developmentDebug` -> `:app:assembleDevelopmentDebug`, the Gradle task for that flavor. */
const gradleCommandFor = (androidVariant) =>
    `:app:assemble${androidVariant.charAt(0).toUpperCase()}${androidVariant.slice(1)}`;

describe('eas.json build profiles', () => {
    it('has exactly one profile per variant', () => {
        expect(Object.keys(easJson.build).sort()).toEqual(Object.keys(VARIANTS).sort());
    });

    it.each(Object.keys(VARIANTS))('%s matches the variant table', (variant) => {
        const profile = easJson.build[variant];
        const config = VARIANTS[variant];

        expect(profile.environment).toBe(VARIANT_EAS_ENVIRONMENTS[variant]);
        expect(profile.channel).toBe(config.updateChannel);
        expect(profile.env.APP_VARIANT).toBe(variant);
        expect(profile.android.gradleCommand).toBe(gradleCommandFor(config.androidVariant));
        expect(profile.ios.scheme).toBe(config.iosScheme);
        expect(profile.ios.buildConfiguration).toBe(config.iosConfiguration);
    });

    it('keeps version ownership with the release workflow, not EAS', () => {
        // `remote` would make EAS the source of versionCode, which is the opposite of how
        // this repo releases: the release workflow sets VERSION_CODE/VERSION_NAME.
        expect(easJson.cli.appVersionSource).toBe('local');
    });
});
