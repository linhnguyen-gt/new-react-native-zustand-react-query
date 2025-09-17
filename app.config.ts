import { ConfigContext, ExpoConfig } from 'expo/config';

import { name } from './package.json';

export default ({ config }: ConfigContext): ExpoConfig => {
    const appName = process.env.APP_NAME || name;
    const versionName = process.env.VERSION_NAME || '1.0.0';
    const versionCode = process.env.VERSION_CODE || '1';

    return {
        ...config,
        name: appName,
        slug: name.toLowerCase(),
        version: versionName,
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
    };
};
