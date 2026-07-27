import type { ExpoConfig } from '@expo/config-types';
import dotenv from 'dotenv';
import { ConfigContext } from 'expo/config';
import fs from 'fs';

import { name } from './package.json';
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

const parseEnvFile = (filePath: string): Record<string, string> => {
    if (!fs.existsSync(filePath)) {
        return {};
    }

    return dotenv.parse(fs.readFileSync(filePath));
};

const requestedVariant = normalizeVariant(process.env.APP_VARIANT);
const envFile = process.env.ENVFILE || VARIANT_ENV_FILES[requestedVariant];
dotenv.config({ path: envFile, override: true });

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

    const nativeVariants = Object.fromEntries(
        (Object.keys(VARIANT_CONFIG) as AppVariant[]).map((appVariant) => {
            const variantEnvFile = VARIANT_ENV_FILES[appVariant];
            const variantEnv = parseEnvFile(variantEnvFile);
            const selectedEnv: Record<string, string | undefined> = appVariant === variant ? process.env : {};
            const getValue = (key: string, fallback = '') => selectedEnv[key] || variantEnv[key] || fallback;
            const nativeVariantConfig = VARIANT_CONFIG[appVariant];

            return [
                appVariant,
                {
                    ...nativeVariantConfig,
                    envFile: variantEnvFile,
                    displayName: getValue('APP_NAME', projectName),
                    versionCode: getValue('VERSION_CODE', versionCode),
                    versionName: getValue('VERSION_NAME', versionName),
                    updateChannel: getValue('EXPO_UPDATE_CHANNEL', nativeVariantConfig.updateChannel),
                },
            ];
        })
    );

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
        plugins,
        extra: {
            ...config.extra,
            appDisplayName: displayName,
            appName: displayName,
            appVariant: variant,
            appFlavor: variant,
            apiUrl,
            nativeVariants,
            versionName,
            versionCode,
            eas: {
                projectId: easProjectId,
            },
            updateChannel,
        },
    };
};
