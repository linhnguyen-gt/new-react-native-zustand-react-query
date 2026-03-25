import { ConfigContext, ExpoConfig } from 'expo/config';

import { name } from './package.json';

export default ({ config }: ConfigContext): ExpoConfig => {
    const appName = process.env.APP_NAME || name;
    const versionName = process.env.VERSION_NAME || '1.0.0';
    const versionCode = process.env.VERSION_CODE || '1';
    const updateChannel = process.env.EXPO_UPDATE_CHANNEL || 'development';

    // EAS Project ID - required for EAS CLI commands
    // Get from config.extra.eas.projectId (set in app.json) or env variable
    const easProjectId = process.env.EXPO_PROJECT_ID || config.extra?.eas?.projectId;

    // Expo Updates configuration - requires EXPO_UPDATE_URL to be set
    const expoUpdateUrl = process.env.EXPO_UPDATE_URL;
    if (!expoUpdateUrl) {
        console.warn('⚠️ EXPO_UPDATE_URL is not set. OTA updates will be disabled.');
    }

    return {
        ...config,
        name: appName,
        slug: name.toLowerCase(),
        version: versionName,
        runtimeVersion: versionName, // Bare workflow requires explicit runtime version
        updates: expoUpdateUrl
            ? {
                  url: expoUpdateUrl,
                  checkAutomatically: 'ON_LOAD',
                  fallbackToCacheTimeout: 0,
              }
            : undefined,
        ios: {
            ...config.ios,
            buildNumber: versionCode,
        },
        android: {
            ...config.android,
            versionCode: parseInt(versionCode, 10),
        },
        userInterfaceStyle: 'automatic',
        plugins: [...(config.plugins ?? []), 'expo-secure-store'],
        extra: {
            ...config.extra,
            eas: {
                projectId: easProjectId,
            },
            updateChannel,
        },
    };
};
