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

/**
 * Maps a configured variant onto the three the app knows about.
 *
 * An unrecognised value falls back to `development` rather than throwing, because
 * `appConfig` is read by presentation code (the sign-in badge, the posts header) that
 * has no business crashing over a build-configuration typo.
 *
 * That fallback is not free, and it is worth knowing what it costs: `development` is
 * the one variant permitted to use cleartext, so `APP_VARIANT=prod` yields a build that
 * accepts `http://` while a user would call it production. `scripts/check-env.js`
 * rejects unrecognised variants outright, so this only bites where that gate is
 * skipped — which is why the build workflows now run it. The warning below is the
 * last line of defence.
 */
const normalizeVariant = (value?: string): AppVariant => {
    if (value === 'development' || value === 'staging' || value === 'production') {
        return value;
    }

    if (value) {
        console.warn(
            `[appConfig] Unrecognised APP_VARIANT "${value}"; falling back to "${DEFAULT_VARIANT}". ` +
                'Cleartext API_URL is permitted for development, so this may weaken the transport floor. ' +
                'Use one of: development, staging, production.'
        );
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

/**
 * Network tuning, gathered here rather than buried as literals in the client.
 *
 * This was `timeout: 30000` sitting inline in `httpClient.ts`, which meant changing it
 * for one environment meant editing the client itself. The value is unchanged; only its
 * home is.
 *
 * `maxRequestsPerWindow` and `rateLimitWindowMs` used to sit here too. They fed a
 * client-side rate limiter that has since been removed — see the note at the top of
 * `httpClient.ts` for why a client cannot rate-limit a server it does not own.
 */
export const networkConfig = {
    /** Default per-request deadline. Overridable per request via `HttpRequestConfig.timeout`. */
    timeoutMs: 30_000,
} as const;
