import type { ExpoConfig } from '@expo/config-types';
import { type ConfigContext } from 'expo/config';

import { name } from './package.json';
// Replaces `dotenv.config({ path: envFile, override: true })`. See that module for the
// precedence it enforces (shell > variant file > whatever @expo/env already loaded) and
// why plain "skip anything already defined" is not sufficient.
//
// Dropping dotenv is also what lets one parser read every env file. dotenv strips inline
// comments and the hand-rolled script parsers did not, so the same file yielded different
// values depending on which tool read it: `.env.example` shipped
// `EXPO_UPDATE_CHANNEL=development # (development|staging|production)` and
// `push-update.cjs` published to a channel with the comment glued on.
import { loadVariantEnv } from './scripts/lib/load-variant-env.cjs';
// Shared with run-native.cjs and sync-native-env.cjs so the three cannot drift.
// Imported rather than `require`d: under `moduleResolution: bundler`, `require` is just
// a function typed `any`, which would silently discard the exhaustiveness checking the
// local `Record<AppVariant, …>` annotation used to provide. An import resolves the
// sibling `.d.cts`, so adding a fourth variant or dropping a field stays a compile error.
// See that module for why `development` carries an inert `scheme`.
import {
    BASE_BUNDLE_IDENTIFIER,
    BASE_PACKAGE_NAME,
    DEFAULT_VARIANT,
    VARIANT_ENV_FILES,
    VARIANTS as VARIANT_CONFIG,
} from './scripts/lib/variant-config.cjs';

type AppVariant = 'development' | 'staging' | 'production';

const APP_ICON_PATH = './assets/branding/icon.png';
const SPLASH_IMAGE_PATH = './assets/branding/splash-logo.png';
const SPLASH_BACKGROUND_COLOR = '#FFFFFF';

const normalizeVariant = (value?: string): AppVariant => {
    if (value === 'development' || value === 'staging' || value === 'production') {
        return value;
    }

    return DEFAULT_VARIANT;
};

/**
 * Loads the variant's env file **without overwriting anything already set**.
 *
 * This replaces `dotenv.config({ path: envFile, override: true })`, and the inverted
 * precedence is the point rather than a side effect:
 *
 *     eas env:exec / shell  >  .env.<variant> file  >  hardcoded default
 *
 * `override: true` meant the file beat the shell, so `eas env:exec --environment preview`
 * would inject the real values and then watch a stale local file overwrite them — the
 * failure would be a build that silently used the wrong API_URL, with both sources
 * looking correct in isolation. Deferring to what is already defined also matches
 * `@expo/env` (`build/index.js:248`), so Expo's own loader and this one cannot disagree
 * about who wins.
 *
 * EAS variables are not readable while `app.config.ts` is evaluated locally, which is why
 * the file path stays: `eas env:pull` materialises the file, and `eas env:exec` bypasses
 * it. Both routes end at `process.env`, and everything below reads only from there.
 */
/**
 * Which env file to read. `APP_VARIANT` only — deliberately not `|| APP_FLAVOR`, which the
 * config object below does accept.
 *
 * The asymmetry looks like an oversight and is not. `APP_FLAVOR` is a legacy alias that
 * lives *inside* the env files, so by the time one has been read it is too late to use it
 * for choosing which file to read. Worse, `@expo/env` may already have loaded a different
 * variant's file (it keys off `NODE_ENV`), which would make `APP_FLAVOR` name a variant
 * nobody asked to build.
 *
 * So the file is selected only from something a caller set explicitly:
 * `run-native.cjs`, `env-exec.cjs` and `eas.json` all export `APP_VARIANT`. A bare
 * `expo start` with neither set resolves to `development`, which is the intended default.
 */
const requestedVariant = normalizeVariant(process.env.APP_VARIANT);

loadVariantEnv({ envFile: process.env.ENVFILE || VARIANT_ENV_FILES[requestedVariant] });

export default ({ config }: ConfigContext): ExpoConfig => {
    const variant = normalizeVariant(process.env.APP_VARIANT || process.env.APP_FLAVOR);
    const variantConfig = VARIANT_CONFIG[variant];
    const projectName = config.name || name;
    const displayName = process.env.APP_NAME || config.name || name;
    const versionName = process.env.VERSION_NAME || '1.0.0';
    const versionCode = process.env.VERSION_CODE || '1';
    const updateChannel = process.env.EXPO_UPDATE_CHANNEL || variantConfig.updateChannel;
    const apiUrl = process.env.API_URL || '';
    const easProjectId = process.env.EXPO_PROJECT_ID || config.extra?.eas?.projectId;
    const expoUpdateUrl = process.env.EXPO_UPDATE_URL;
    if (!expoUpdateUrl) {
        console.warn('EXPO_UPDATE_URL is not set. OTA updates will be disabled.');
    }

    // No `nativeVariants` is built here any more.
    //
    // This file used to parse all three env files to assemble a table whose only consumer
    // was the config plugin, then publish it under `extra` — the *runtime* manifest — so
    // every shipped binary advertised the display names, versions, update channels and
    // env-file paths of all three variants for the benefit of code that finishes running
    // during `expo prebuild`. The plugin reads the files itself now, which also removes the
    // last reason this file needed a multi-file env parser at all.
    const plugins: NonNullable<ExpoConfig['plugins']> = [
        './plugins/with-environment-support.cjs',
        [
            'expo-splash-screen',
            {
                image: SPLASH_IMAGE_PATH,
                backgroundColor: SPLASH_BACKGROUND_COLOR,
                resizeMode: 'contain',
            },
        ],
        ...(config.plugins ?? []),
        'expo-secure-store',
    ];

    return {
        ...config,
        name: projectName,
        slug: name.toLowerCase(),
        /**
         * Deep-link scheme, per variant.
         *
         * Without this, `expo prebuild` falls back to `exp+<slug>` plus the base bundle
         * identifier — both identical across the three variants. Install two of them on one
         * device and iOS can no longer tell which app a link is for: it puts up an "Open in
         * …?" chooser, and an OAuth callback lands in whichever the user picks.
         *
         * The value here is the one the Expo CLI opens after `expo run:*`, so it must be
         * the real scheme of the variant being built, not a placeholder. The generated
         * native projects hold one Info.plist and one AndroidManifest shared by all three
         * variants, so those get a build-time variable instead — see `withUrlScheme` in
         * `plugins/with-environment-support.cjs`.
         */
        scheme: variantConfig.bundleIdentifier,
        version: versionName,
        runtimeVersion: versionName,
        icon: APP_ICON_PATH,
        updates: expoUpdateUrl
            ? {
                  url: expoUpdateUrl,
                  checkAutomatically: 'ON_LOAD',
                  fallbackToCacheTimeout: 0,
              }
            : undefined,
        ios: {
            ...config.ios,
            bundleIdentifier: BASE_BUNDLE_IDENTIFIER,
            buildNumber: versionCode,
        },
        android: {
            ...config.android,
            adaptiveIcon: {
                foregroundImage: APP_ICON_PATH,
                backgroundColor: SPLASH_BACKGROUND_COLOR,
            },
            package: BASE_PACKAGE_NAME,
            versionCode: parseInt(versionCode, 10),
        },
        userInterfaceStyle: 'automatic',
        /**
         * React Compiler, on.
         *
         * `babel-plugin-react-compiler@1.0.0` already ships as a dependency of
         * `babel-preset-expo@57`; this flag is what makes the preset load it. The
         * detection runs through the babel caller (`getReactCompiler`), which Metro
         * populates from this config — which is why the switch lives here and not in
         * `babel.config.cjs`.
         *
         * What it changes: memoisation becomes the compiler's job. The hand-written
         * `useCallback`/`useMemo`/`React.memo` scattered through the screens stays correct
         * but stops being load-bearing, and new code does not need to add more. Components
         * that break the rules of hooks are skipped rather than miscompiled — run
         * `pnpm lint` and fix what `react-hooks` reports before assuming a component is
         * being optimised.
         */
        experiments: {
            ...config.experiments,
            reactCompiler: true,
        },
        plugins,
        extra: {
            ...config.extra,
            appDisplayName: displayName,
            appName: displayName,
            appVariant: variant,
            appFlavor: variant,
            apiUrl,
            // No `nativeVariants` here — see the plugin entry above. `extra` is the runtime
            // manifest and should carry only what the running app reads.
            versionName,
            versionCode,
            eas: {
                projectId: easProjectId,
            },
            updateChannel,
        },
    };
};
