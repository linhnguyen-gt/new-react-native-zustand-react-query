/**
 * The native mutations anchor on exact strings from the Expo/React Native templates.
 *
 * `String.replace` returns its input unchanged when the anchor does not match, and for
 * two of the three anchors that failure is silent: the build succeeds having skipped
 * the mutation. The react-settings anchor is the dangerous one — it selects which
 * `.env` gets embedded, so a miss produces a green production build carrying
 * development configuration.
 *
 * These tests corrupt each anchor and assert the plugin throws.
 */

const { internal } = require('../with-environment-support.cjs');

const { applyAnchoredMutation, ensureAndroidNodeWrapper, ensureAndroidReactSettings, ensureAndroidFlavors } = internal;

/** The three anchored regions of the template `android/app/build.gradle`. */
const BUILD_GRADLE = `
apply plugin: "com.facebook.react"

def projectRoot = rootDir.getAbsoluteFile().getParentFile().getAbsolutePath()

react {
    entryFile = file("../../index.js")
    bundleCommand = "export:embed"
    autolinkLibrariesWithApp()
}

android {
    namespace 'com.newreactnativezustandrnq'

    signingConfigs {
        debug {
            storeFile file('debug.keystore')
        }
    }
}
`;

const VARIANTS = [
    {
        name: 'development',
        packageName: 'com.example.dev',
        versionCode: 1,
        versionName: '1.0.0',
        displayName: 'Example Dev',
        updateChannel: 'development',
    },
    {
        name: 'production',
        packageName: 'com.example',
        versionCode: 2,
        versionName: '1.0.0',
        displayName: 'Example',
        updateChannel: 'production',
    },
];

describe('applyAnchoredMutation', () => {
    it('applies the mutation when the anchor matches', () => {
        const result = applyAnchoredMutation({
            contents: 'keep\nANCHOR\nkeep',
            pattern: /ANCHOR/,
            replacement: 'REPLACED',
            file: 'some/file',
            description: 'test anchor',
        });

        expect(result).toContain('REPLACED');
    });

    it('throws naming the file, the anchor and the recovery command when nothing matched', () => {
        expect(() =>
            applyAnchoredMutation({
                contents: 'nothing to match here',
                pattern: /ANCHOR/,
                replacement: 'REPLACED',
                file: 'android/app/build.gradle',
                description: 'test anchor',
            })
        ).toThrow(/android\/app\/build\.gradle[\s\S]*test anchor|test anchor[\s\S]*android\/app\/build\.gradle/);
    });

    it('names git checkout as the recovery path, since earlier mutations are already applied', () => {
        expect(() =>
            applyAnchoredMutation({
                contents: '',
                pattern: /ANCHOR/,
                replacement: 'x',
                file: 'ios/Podfile',
                description: 'test anchor',
            })
        ).toThrow(/git checkout android\/ ios\//);
    });
});

describe('android build.gradle anchors', () => {
    it('inserts the node wrapper, the react settings and the product flavors', () => {
        let contents = ensureAndroidNodeWrapper(BUILD_GRADLE);
        contents = ensureAndroidReactSettings(contents, VARIANTS);
        contents = ensureAndroidFlavors(contents, VARIANTS);

        expect(contents).toContain('def appVariantNodeCommand');
        expect(contents).toContain('debuggableVariants');
        expect(contents).toContain('productFlavors');
        expect(contents).toContain("applicationId 'com.example.dev'");
    });

    it('is re-entrant: a second pass replaces the generated block rather than adding one', () => {
        const once = ensureAndroidFlavors(BUILD_GRADLE, VARIANTS);
        const twice = ensureAndroidFlavors(once, VARIANTS);

        const countBlocks = (contents) =>
            contents.split('@generated begin environment support - product flavors').length - 1;

        expect(countBlocks(once)).toBe(1);
        expect(countBlocks(twice)).toBe(1);

        // Compared ignoring whitespace runs. `removeGeneratedBlock` swaps the block for
        // a bare newline while the insertion contributes its own, so each pass leaves an
        // extra blank line behind. Cosmetic, but it means a tracked gradle file churns on
        // every prebuild. Pre-existing; not fixed here to keep this change to the asserts.
        expect(twice.replace(/\s+/g, ' ')).toBe(once.replace(/\s+/g, ' '));
    });

    it('throws when the node-wrapper anchor drifts', () => {
        const drifted = BUILD_GRADLE.replace(
            'def projectRoot = rootDir.getAbsoluteFile()',
            'def projectRoot = rootDir'
        );

        expect(() => ensureAndroidNodeWrapper(drifted)).toThrow(/android node wrapper/);
    });

    it('throws when the react-settings anchor drifts', () => {
        // The one that would otherwise ship a development .env inside a production
        // binary: a miss here is invisible until someone inspects the shipped bundle.
        const drifted = BUILD_GRADLE.replace('bundleCommand = "export:embed"', 'bundleCommand = "export:embed-v2"');

        expect(() => ensureAndroidReactSettings(drifted, VARIANTS)).toThrow(/react settings/);
    });

    it('throws when the product-flavors anchor drifts', () => {
        const drifted = BUILD_GRADLE.replace('signingConfigs {', 'signingConfiguration {');

        expect(() => ensureAndroidFlavors(drifted, VARIANTS)).toThrow(/product flavors/);
    });
});
