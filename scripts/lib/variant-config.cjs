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
 * Importers: `app.config.ts`, `check-env.js`, `run-native.cjs`, `sync-native-env.cjs`,
 * `push-update.cjs`, `env-exec.cjs`, `env-sync.cjs`, `setup-env.js`, and
 * `plugins/with-environment-support.cjs`. Anything that needs a variant value reads it from
 * here.
 *
 * One consumer cannot: `eas.json` is static JSON with no way to import anything, so each
 * build profile restates `iosScheme`, `iosConfiguration` and the Gradle task name by hand.
 * Rename a value here and those copies must be edited to match. The defence is
 * `lib/__tests__/eas-profiles.test.js`, which fails when the two disagree — read its header
 * for what each kind of drift costs. Keep that test passing and `eas.json` cannot rot
 * silently; delete it and nothing else will notice.
 *
 * `plugins/with-environment-support.cjs` additionally keeps its own `VARIANT_NAMES` list
 * (plugin line 30) alongside the `VARIANTS` it imports — see that file's header for why.
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

/**
 * The EAS environment each variant's values live in.
 *
 * EAS ships exactly three environments — `development`, `preview`, `production` — and
 * naming a fourth one `staging` is a paid feature (Production plan and above). So the
 * repo's `staging` variant maps onto EAS's `preview`, and only here: the local file name,
 * the Gradle flavor, the Xcode scheme and the update channel all keep saying "staging".
 *
 * Kept in this table rather than written into each script for the same reason everything
 * else here is: a second copy is a second thing to forget. Pushing a variant's values to
 * the wrong EAS environment is silent — the command succeeds and the next build reads
 * someone else's API_URL.
 *
 *   eas env:pull preview --path .env.staging
 *   eas env:push preview --path .env.staging
 */
const VARIANT_EAS_ENVIRONMENTS = {
    development: 'development',
    staging: 'preview',
    production: 'production',
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
    VARIANT_EAS_ENVIRONMENTS,
    getAndroidAppId,
};
