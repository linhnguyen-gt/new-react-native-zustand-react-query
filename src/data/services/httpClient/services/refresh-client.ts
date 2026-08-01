import axios, { type AxiosInstance, HttpStatusCode, isAxiosError } from 'axios';

/**
 * The refresh endpoint, relative to the client's baseURL.
 *
 * Exported so the response interceptor can exclude it from its own 401 handling.
 * Without that exclusion a 401 from this endpoint re-enters the refresh path and
 * recurses until the heap is exhausted — confirmed empirically, not theoretically:
 * an early draft of the error-propagation tests OOM'd the jest worker after ~120s
 * with "Ineffective mark-compacts near heap limit".
 */
export const REFRESH_ENDPOINT = 'refresh-token';

/**
 * Hard ceiling on a refresh round trip.
 *
 * Axios defaults to `timeout: 0`, meaning wait forever. That default is what makes a
 * single-flight refresh dangerous: one stalled request leaves the shared in-flight
 * promise pending forever, and every subsequent 401 awaits it. The user sees infinite
 * spinners with no error and no log. A bounded deadline turns that into an ordinary
 * failure that the retry and back-off logic can handle.
 */
export const REFRESH_TIMEOUT_MS = 15_000;

/**
 * ⚠ ASSUMED CONTRACT — chosen deliberately, NOT confirmed against a backend.
 *
 * This repository has no server. Every field below is a guess encoding a decision
 * made while writing this phase, recorded here so whoever wires a real backend knows
 * exactly what to re-check rather than discovering it in production:
 *
 *   POST {baseURL}/refresh-token
 *   body: { "refreshToken": "<token>" }
 *
 *   200 → { "data": { "accessToken", "refreshToken", "expiredAt", "refreshExpiredAt"? } }
 *   401/403 → the credential is rejected; the stored token is cleared
 *   anything else (timeout, DNS, 5xx) → transport failure; the stored token is KEPT
 *
 * Three choices worth flagging:
 *
 * 1. **POST with the credential in the body**, not GET with it in the query string.
 *    A refresh token on a GET lands in server access logs, proxy logs and any
 *    intermediary that records URLs. The previous code used GET — and attached no
 *    credential at all.
 *
 * 2. **Rotation**: the response returns a NEW refresh token, so a stolen one stops
 *    working after the legitimate client next refreshes. If the backend does not
 *    rotate, `refreshToken` will simply be absent and the stored one is left in
 *    place — see `applyRefreshResult`.
 *
 * 3. `expiredAt` is the ACCESS token's expiry and `refreshExpiredAt` the refresh
 *    token's. They are deliberately separate fields. Conflating them is the trap
 *    described in this phase: feeding a minutes-long access expiry into the refresh
 *    token's retention window makes `getToken()` declare the refresh token expired
 *    minutes after login and log the user out.
 */
export interface RefreshResponseBody {
    data?: {
        accessToken?: string;
        refreshToken?: string;
        /** Access-token expiry, epoch ms. */
        expiredAt?: number;
        /** Refresh-token expiry, epoch ms. Absent means "use the local retention default". */
        refreshExpiredAt?: number;
    };
}

/** A validated refresh response. `accessToken` is guaranteed non-empty. */
export interface RefreshResult {
    accessToken: string;
    refreshToken?: string;
    expiredAt?: number;
    refreshExpiredAt?: number;
}

/**
 * Raised when the refresh response was structurally unusable.
 *
 * Distinct from a transport failure and distinct from a rejected credential: this is
 * a 200 whose body did not carry what the contract promises. It used to be treated as
 * success, which left the user with no Authorization header, a refresh token still on
 * disk, no logout, and no scheduled retry — silently unauthenticated forever.
 */
export class RefreshContractError extends Error {
    constructor(reason: string) {
        super(`Refresh response did not match the expected contract: ${reason}`);
        this.name = 'RefreshContractError';
        Object.setPrototypeOf(this, RefreshContractError.prototype);
    }
}

/**
 * Raised when there is no credential to refresh with.
 *
 * Terminal, unlike every other refresh failure. A transport failure is worth keeping
 * the token for and retrying later; an absent token has nothing to retry with, so
 * treating it as transient just leaves the user unauthenticated until an unrelated
 * failure ceiling happens to trip.
 */
export class MissingCredentialError extends Error {
    constructor() {
        super('No refresh token is stored');
        this.name = 'MissingCredentialError';
        Object.setPrototypeOf(this, MissingCredentialError.prototype);
    }
}

/**
 * Whether a failed refresh means the server rejected the credential itself.
 *
 * Only 401 and 403 clear the stored token. Everything else — offline, DNS failure,
 * timeout, 5xx — keeps it, because destroying a valid credential over a transient
 * network blip logs the user out for a reason that had nothing to do with them.
 * A `RefreshContractError` also keeps the token: a malformed 200 says the server is
 * misbehaving, not that the credential is bad.
 */
export const isCredentialRejected = (error: unknown): boolean => {
    if (!isAxiosError(error)) return false;

    const status = error.response?.status;
    return status === HttpStatusCode.Unauthorized || status === HttpStatusCode.Forbidden;
};

/**
 * Builds the axios instance used for refreshing.
 *
 * Deliberately interceptor-free. The shared client's response interceptor is what
 * triggers a refresh on 401, so issuing the refresh through that same instance is
 * what allowed the recursion.
 *
 * Being interceptor-free also means it inherits no `Authorization` default, which is
 * precisely why the credential must be attached explicitly per request rather than
 * relied upon from instance state.
 */
export const createRefreshClient = (baseURL?: string, timeout: number = REFRESH_TIMEOUT_MS): AxiosInstance =>
    axios.create({ baseURL, timeout });

/**
 * Performs one refresh round trip and validates the response.
 *
 * @param client an interceptor-free instance from {@link createRefreshClient}
 * @param refreshToken the stored credential; must be non-empty
 * @throws RefreshContractError if the response carries no usable access token
 */
export const requestRefresh = async (client: AxiosInstance, refreshToken: string): Promise<RefreshResult> => {
    if (!refreshToken) {
        // Asserted rather than assumed: dispatching without a credential guarantees a
        // 401, which the caller would then read as "the credential was rejected" and
        // clear a token that was never sent.
        throw new MissingCredentialError();
    }

    // AbortController alongside the axios timeout, not instead of it. They cover
    // different stalls: axios's timer governs the response, while an abort also
    // releases a connection wedged before any response begins.
    const controller = new AbortController();
    const deadline = setTimeout(() => controller.abort(), REFRESH_TIMEOUT_MS);

    try {
        const response = await client.post<RefreshResponseBody>(
            REFRESH_ENDPOINT,
            { refreshToken },
            { signal: controller.signal }
        );

        const data = response.data?.data;

        if (!data?.accessToken) {
            throw new RefreshContractError('response contained no accessToken');
        }

        return {
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            expiredAt: data.expiredAt,
            refreshExpiredAt: data.refreshExpiredAt,
        };
    } finally {
        clearTimeout(deadline);
    }
};
