import { type AxiosInstance } from 'axios';

import { type HttpClient } from '../httpClient';
import { type ITokenService, type Session } from '../interfaces/IHttpClient';

import {
    createRefreshClient,
    isCredentialRejected,
    MissingCredentialError,
    type RefreshResult,
    requestRefresh,
} from './refresh-client';

import { clearToken, getToken, Logger, setToken } from '@/shared/helper';

/** Refresh this long before the access token actually expires. */
const REFRESH_BUFFER_MS = 30 * 1000;

/**
 * Consecutive transient failures tolerated before giving up and logging out.
 *
 * Without a ceiling, a refresh that fails forever — a decommissioned endpoint, a
 * permanently unreachable host — retries for the life of the process while the user
 * sits in a broken session that never resolves and never ends.
 */
const MAX_CONSECUTIVE_FAILURES = 5;

export class TokenService implements ITokenService {
    private readonly httpClient: HttpClient;

    /** Built lazily so the baseURL is read after HttpClient's constructor has run. */
    private refreshClient: AxiosInstance | null = null;

    /**
     * The single in-flight refresh, shared by every concurrent caller.
     *
     * N simultaneous 401s previously fired N refreshes, each racing to write the
     * session — last writer wins, and with rotation every loser's response carries a
     * refresh token that is already invalid.
     */
    private inFlight: Promise<RefreshResult> | null = null;

    /**
     * Incremented whenever the session ends.
     *
     * `TokenService` is instantiated once inside `HttpClient`'s private constructor and
     * lives for the whole process — it outlives logout and account switch. Without this
     * counter, a refresh started as user A and resolving after logout would re-install
     * A's Authorization header and schedule A's refresh timer, on a logged-out client or
     * on newly logged-in user B. The epoch is captured before dispatch and re-checked
     * before anything is written.
     */
    private sessionEpoch = 0;

    private consecutiveFailures = 0;

    constructor(httpClient: HttpClient) {
        this.httpClient = httpClient;
    }

    /**
     * Installs a session. This is the **login** path and is deliberately not epoch-
     * guarded: it establishes a session rather than updating one, so there is no prior
     * epoch to compare against.
     *
     * The refresh path does not come through here — it uses `applyRefreshedSession`,
     * which re-checks the epoch across its awaits so a logout landing mid-write cannot
     * be undone by a refresh completing afterwards.
     */
    async setSession(session: Session): Promise<void> {
        this.httpClient.setAccessToken(session.accessToken);

        // `refreshExpiredAt`, never `expiredAt`. See the Session docs: the access-token
        // expiry is minutes away and would expire the stored refresh token immediately.
        await setToken({
            refreshToken: session.refreshToken || undefined,
            expiresAt: session.refreshExpiredAt,
        });

        this.scheduleRefresh(session.expiredAt);
    }

    /**
     * Ends the session and invalidates any refresh in flight.
     *
     * Now identical to {@link logout} — both are kept because `ITokenService` declares
     * both and callers use them to express intent. This previously delegated to
     * `setToken({ refreshToken: null })`, which `setToken` early-returns on, so it
     * removed nothing: a revoked credential survived on the device indefinitely.
     */
    async clearSession(): Promise<void> {
        await this.endSession();
    }

    async logout(): Promise<void> {
        await this.endSession();
    }

    async getRefreshToken(): Promise<string | null> {
        const token = await getToken();
        return token ?? null;
    }

    /**
     * Refreshes the access token.
     *
     * @returns whether the session was refreshed. Never throws: the scheduled timer
     * and the response interceptor both call this without a handler in a position to
     * do anything useful with an exception.
     */
    async refreshToken(): Promise<boolean> {
        const epoch = this.sessionEpoch;

        try {
            const result = await this.dedupedRefresh();
            return await this.applyRefreshedSession(epoch, result);
        } catch (error) {
            return await this.handleRefreshFailure(error, epoch);
        }
    }

    /**
     * Writes a refreshed session, abandoning the write if the session ended underneath it.
     *
     * The epoch is checked twice on purpose. Checking only before the write leaves a
     * window: `setAccessToken` runs synchronously, then `setToken` suspends on keystore
     * IO, and a logout landing in that gap would complete its teardown only for this
     * write to finish afterwards — restoring the Authorization header, writing the
     * refresh token back into the keystore that was just cleared, and arming a timer.
     * The logged-out device would hold a live credential and silently re-authenticate.
     */
    private async applyRefreshedSession(epoch: number, result: RefreshResult): Promise<boolean> {
        if (epoch !== this.sessionEpoch) {
            Logger.warn('TokenService', 'Discarding a refresh that resolved after the session ended');
            return false;
        }

        this.httpClient.setAccessToken(result.accessToken);

        // `refreshExpiredAt`, never `expiredAt`. See the Session docs: the access-token
        // expiry is minutes away and would expire the stored refresh token immediately.
        await setToken({
            // Absent means the backend does not rotate; `setToken` ignores a falsy
            // value, leaving the stored credential in place.
            refreshToken: result.refreshToken,
            expiresAt: result.refreshExpiredAt,
        });

        // The keystore write suspended. Re-check, and undo if we lost the race — the
        // header and the stored token above may both have been re-armed after a logout.
        if (epoch !== this.sessionEpoch) {
            Logger.warn('TokenService', 'Session ended mid-write; tearing the refreshed session back down');
            await this.endSession();
            return false;
        }

        this.scheduleRefresh(result.expiredAt);
        return true;
    }

    /** Collapses concurrent refreshes onto one request. */
    private dedupedRefresh(): Promise<RefreshResult> {
        if (this.inFlight) return this.inFlight;

        const pending: Promise<RefreshResult> = this.doRefresh().finally(() => {
            // Compare before clearing. An unconditional null is an ABA bug: an old
            // refresh settling after `endSession()` has already nulled the field would
            // wipe a NEWER session's in-flight promise, so the next caller starts a
            // second concurrent refresh. With rotation that is not merely wasteful —
            // both rotate, and the loser's stored token is dead on arrival.
            if (this.inFlight === pending) {
                this.inFlight = null;
            }
        });

        this.inFlight = pending;
        return pending;
    }

    private async doRefresh(): Promise<RefreshResult> {
        const refreshToken = await this.getRefreshToken();

        if (!refreshToken) {
            throw new MissingCredentialError();
        }

        try {
            const result = await requestRefresh(this.getRefreshClient(), refreshToken);
            this.consecutiveFailures = 0;
            return result;
        } catch (error) {
            // Counted here, once per dispatched request — not in the per-caller failure
            // handler. `dedupedRefresh` collapses N waiters onto one attempt, so counting
            // there turned a single offline blip with five queued requests into five
            // "consecutive failures" and an immediate logout: the exact credential loss
            // the 401/403-only rule exists to prevent.
            if (!isCredentialRejected(error)) {
                this.consecutiveFailures += 1;
            }
            throw error;
        }
    }

    private getRefreshClient(): AxiosInstance {
        this.refreshClient ??= createRefreshClient(this.httpClient.getBaseURL());
        return this.refreshClient;
    }

    /**
     * Decides whether a failed refresh should cost the user their stored credential.
     *
     * Only an explicit server rejection does. Every other failure — offline, DNS,
     * timeout, 5xx, a malformed 200 — keeps the token, because deleting a valid
     * credential over a transient blip logs the user out for a reason unrelated to
     * them. A ceiling on consecutive failures stops that leniency becoming an
     * unbreakable loop.
     */
    private async handleRefreshFailure(error: unknown, epoch: number): Promise<boolean> {
        Logger.error('TokenService', 'Error refreshing token', error);

        // Someone already ended the session while this was failing. Their teardown is
        // authoritative; touching state now would fight it.
        if (epoch !== this.sessionEpoch) return false;

        // The server said the credential is bad, so keeping it serves no one.
        if (isCredentialRejected(error)) {
            await this.logout();
            return false;
        }

        // Nothing to retry with. Leaving this as "transient" would strand the user
        // unauthenticated until an unrelated failure ceiling happened to trip.
        if (error instanceof MissingCredentialError) {
            await this.logout();
            return false;
        }

        // The counter is incremented in `doRefresh`, once per dispatched request, so a
        // burst of waiters sharing one failed attempt counts once rather than N times.
        if (this.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
            Logger.warn('TokenService', `Refresh failed ${this.consecutiveFailures} times in a row, ending session`);
            await this.logout();
        }

        return false;
    }

    private scheduleRefresh(expiredAt?: number): void {
        this.httpClient.clearRefreshTokenTimeout();

        if (!expiredAt) return;

        const refreshTime = expiredAt - Date.now() - REFRESH_BUFFER_MS;
        if (refreshTime <= 0) return;

        const timeoutId = setTimeout(() => {
            // Nothing owns this call, so nothing can catch it. `refreshToken` is written
            // not to throw, but an unguarded rejection from an ownerless timer would be
            // an unhandled rejection with no stack pointing anywhere useful.
            void this.refreshToken().catch((error: unknown) => {
                Logger.error('TokenService', 'Scheduled refresh failed', error);
            });
        }, refreshTime);

        this.httpClient.setRefreshTokenTimeout(Number(timeoutId));
    }

    private async endSession(): Promise<void> {
        // Bump first: any refresh already in flight must fail its epoch check rather
        // than write into the session replacing this one.
        this.sessionEpoch += 1;
        this.inFlight = null;
        this.consecutiveFailures = 0;

        this.httpClient.clearRefreshTokenTimeout();
        await clearToken();
        this.httpClient.clearSession();
    }
}
