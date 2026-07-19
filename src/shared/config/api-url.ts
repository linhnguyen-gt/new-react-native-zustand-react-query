type AppVariant = 'development' | 'staging' | 'production';

/**
 * Variants that must talk HTTPS. Development is exempt so a local server on
 * `http://localhost:3000` still works.
 */
const HTTPS_REQUIRED_VARIANTS: readonly AppVariant[] = ['staging', 'production'];

/**
 * Validates the configured API base URL, throwing rather than degrading.
 *
 * Two failures this prevents, both of which used to be silent:
 *
 * **An empty URL.** `appConfig.apiUrl` falls back to `''`, and axios treats an empty
 * baseURL as "resolve relative to the current location" — on a device that produces
 * requests to nowhere, surfacing as confusing transport errors far from the actual
 * cause. Refusing to start is the smaller cost.
 *
 * **Cleartext in a shipped build.** `.env.example` shipped `http://localhost:3000` as
 * the template every environment is copied from, so an operator editing the host but
 * not the scheme produces `http://api.example.com`. That is not evenly punished:
 * Android's cleartext block turns it into total failure, while iOS ships
 * `NSAllowsLocalNetworking: true` in the production Info.plist, so local-network
 * cleartext quietly succeeds. Combined with the variant falling back to `development`
 * on an unrecognised value, a misconfigured build can talk cleartext to a dev host
 * while presenting itself as production.
 *
 * Note this establishes a transport floor only. There is no certificate pinning
 * anywhere in the repo — acknowledged as a gap rather than silently omitted.
 *
 * @param apiUrl the configured value, typically `appConfig.apiUrl`
 * @param variant the build variant deciding whether cleartext is tolerated
 * @returns the URL, unchanged, when it is usable
 * @throws Error naming the variable and the variant when it is not
 */
export const assertValidApiUrl = (apiUrl: string, variant: AppVariant): string => {
    const trimmed = apiUrl.trim();

    if (!trimmed) {
        throw new Error(
            'API_URL is not set. The app cannot choose a server for you, and an empty base URL ' +
                'silently turns every request into a relative one. Set API_URL in the .env file for ' +
                `the "${variant}" variant, then rebuild.`
        );
    }

    if (!/^https?:\/\//i.test(trimmed)) {
        throw new Error(`API_URL must start with http:// or https://, but is "${trimmed}".`);
    }

    // Everything between the scheme and the first /, ? or #.
    //
    // Checked with string operations rather than `new URL`: Hermes' URL implementation
    // is not fully spec-compliant and the polyfill is no longer imported anywhere, so
    // relying on it here would make this validator's behaviour depend on the runtime.
    const authority = trimmed.replace(/^https?:\/\//i, '').split(/[/?#]/)[0];

    if (!authority) {
        // `https://` alone passes the scheme test and produces requests to a host that
        // does not exist — axios resolves `posts` against it and fails somewhere far away.
        throw new Error(`API_URL has no host: "${trimmed}".`);
    }

    if (authority.includes('@')) {
        // Credentials in a base URL end up in every log line and error breadcrumb, since
        // `errorContext.endpoint` carries the request URL.
        throw new Error('API_URL must not embed credentials. Send them as headers instead.');
    }

    if (HTTPS_REQUIRED_VARIANTS.includes(variant) && !/^https:\/\//i.test(trimmed)) {
        throw new Error(
            `API_URL must use https:// for the "${variant}" variant, but is "${trimmed}". ` +
                'Cleartext is allowed only for development. Note that iOS may let this succeed on a ' +
                'local network while Android blocks it outright, so a cleartext production build can ' +
                'appear to work on one platform and fail completely on the other.'
        );
    }

    return trimmed;
};
