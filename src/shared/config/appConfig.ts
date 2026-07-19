import Constants from 'expo-constants';

type AppVariant = 'development' | 'staging' | 'production';

type ExpoExtraConfig = {
    appFlavor?: AppVariant;
    appName?: string;
    appVariant?: AppVariant;
    apiUrl?: string;
    updateChannel?: string;
    versionCode?: string;
    versionName?: string;
};

const DEFAULT_VARIANT: AppVariant = 'development';

const normalizeVariant = (value?: string): AppVariant => {
    if (value === 'development' || value === 'staging' || value === 'production') {
        return value;
    }

    return DEFAULT_VARIANT;
};

const extra = (Constants.expoConfig?.extra ?? {}) as ExpoExtraConfig;
const appVariant = normalizeVariant(extra.appVariant || extra.appFlavor);
const versionCode =
    extra.versionCode ||
    String(Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode || '1');

export const appConfig = {
    apiUrl: extra.apiUrl || '',
    appName: extra.appName || Constants.expoConfig?.name || 'App',
    updateChannel: extra.updateChannel || appVariant,
    variant: appVariant,
    versionCode,
    versionName: extra.versionName || Constants.expoConfig?.version || '1.0.0',
} as const;
