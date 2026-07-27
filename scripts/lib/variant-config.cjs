/**
 * One variant table for every consumer.
 *
 * These values were duplicated across three files that had no way of noticing when they
 * disagreed:
 *
 *   app.config.ts       bundleIdentifier / packageName / scheme / updateChannel
 *   run-native.cjs      androidAppId / androidVariant / iosScheme / iosConfiguration
 *   sync-native-env.cjs the Xcode project path, hardcoded
 *
 * The concrete failure: `run-native.cjs` passes `--app-id` to `expo run:android`, which
 * is what the launch step uses to start the installed package. Change the package name
 * in `app.config.ts` and the build installs `com.example.new` while the launcher still
 * asks for `com.example.old` — the app builds, installs, and then fails to start with an
 * error that points at the device rather than at the config.
 *
 * `androidAppId` is now derived from `packageName` rather than restated, so that class
 * of drift is not expressible.
 *
 * Consumers: `app.config.ts`, `run-native.cjs`, `sync-native-env.cjs`, `check-env.js`,
 * `push-update.cjs`. Two tables deliberately remain outside:
 *
 * - `plugins/with-environment-support.cjs` keeps its own `VARIANT_NAMES`. It runs inside
 *   `expo prebuild`, and coupling it to `scripts/` would tie native generation to a
 *   directory that need not be present in every build context.
 * - `setup-env.js` names env files literally while *creating* them, which is a different
 *   job from reading an existing one.
 */

const IOS_PROJECT_NAME = 'NewReactNativeZustandRNQ';
const BASE_BUNDLE_IDENTIFIER = 'com.newreactnativezustandrnq';
const BASE_PACKAGE_NAME = 'com.newreactnativezustandrnq';

/**
 * The variant the app falls back to, and the only one that maps onto Xcode's stock
 * scheme and Debug configuration.
 *
 * This is why `development` looks inconsistent with the other two and is not a bug:
 * the iOS plugin deliberately skips it when generating per-variant build configurations
 * and `.xcscheme` files, so no `Development.xcscheme` and no `Development.Debug`
 * configuration exist on disk. Its `scheme` field below is inert for iOS — it is carried
 * only so the table has a uniform shape — while `iosScheme`/`iosConfiguration` describe
 * what actually gets built.
 */
const DEFAULT_VARIANT = 'development';

const VARIANTS = {
    development: {
        bundleIdentifier: `${BASE_BUNDLE_IDENTIFIER}.dev`,
        packageName: `${BASE_PACKAGE_NAME}.dev`,
        scheme: 'Development',
        updateChannel: 'development',
        androidVariant: 'developmentDebug',
        iosScheme: IOS_PROJECT_NAME,
        iosConfiguration: 'Debug',
    },
    staging: {
        bundleIdentifier: `${BASE_BUNDLE_IDENTIFIER}.stg`,
        packageName: `${BASE_PACKAGE_NAME}.stg`,
        scheme: 'Staging',
        updateChannel: 'staging',
        androidVariant: 'stagingDebug',
        iosScheme: 'Staging',
        iosConfiguration: 'Staging.Debug',
    },
    production: {
        bundleIdentifier: BASE_BUNDLE_IDENTIFIER,
        packageName: BASE_PACKAGE_NAME,
        scheme: 'Production',
        updateChannel: 'production',
        androidVariant: 'productionDebug',
        iosScheme: 'Production',
        iosConfiguration: 'Production.Debug',
    },
};

/** Env file per variant, matching what `check-env.js` and `app.config.ts` expect. */
const VARIANT_ENV_FILES = {
    development: '.env',
    staging: '.env.staging',
    production: '.env.production',
};

/** The Android application id used to launch the installed build. Never restated. */
const getAndroidAppId = (variantName) => VARIANTS[variantName].packageName;

module.exports = {
    IOS_PROJECT_NAME,
    BASE_BUNDLE_IDENTIFIER,
    BASE_PACKAGE_NAME,
    DEFAULT_VARIANT,
    VARIANTS,
    VARIANT_ENV_FILES,
    getAndroidAppId,
};
