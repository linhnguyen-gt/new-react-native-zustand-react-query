import ApiMethod from '../apiMethod';

export interface Session {
    accessToken?: string;
    refreshToken?: string;
    /** Access-token expiry, epoch ms. Drives when a refresh is scheduled. */
    expiredAt?: number;
    /**
     * Refresh-token expiry, epoch ms — a different value from `expiredAt`, kept as a
     * separate field so the two cannot be confused. Feeding the access-token expiry
     * into the refresh token's retention window logs the user out minutes after login.
     */
    refreshExpiredAt?: number;
}

type BaseHttpRequestConfig = {
    endpoint: string;
    method: ApiMethod;
    headers?: Record<string, string>;
    /** Per-request deadline in ms, overriding the client default. */
    timeout?: number;
    /**
     * Cancellation signal.
     *
     * React Query hands its query function an `AbortSignal` and expects it to be
     * forwarded; without this the signal was accepted nowhere, so cancelling a query —
     * navigating away from a screen mid-request — left the request running to
     * completion and its response discarded.
     */
    signal?: AbortSignal;
};

type PostHttpRequestConfig = BaseHttpRequestConfig & {
    method: ApiMethod.POST | ApiMethod.DELETE;
    body?: Record<string, any>;
    params?: never;
};

type NonPostHttpRequestConfig = BaseHttpRequestConfig & {
    method: Exclude<ApiMethod, ApiMethod.POST>;
    params?: Record<string, any>;
    body?: never;
};

export type HttpRequestConfig = PostHttpRequestConfig | NonPostHttpRequestConfig;

export interface IHttpClient {
    request<T>(config: HttpRequestConfig): Promise<HttpResponse<T>>;
    clearSession(): void;
    setAccessToken(accessToken: string): void;
}

export interface ITokenService {
    refreshToken(): Promise<boolean>;
    setSession(session: Session): Promise<void>;
    clearSession(): Promise<void>;
    getRefreshToken(): Promise<string | null>;
    logout(): Promise<void>;
}

/**
 * A response that was actually received.
 *
 * There is deliberately no `ok` flag and no `error` field. `HttpClient.request`
 * either returns this shape or throws a typed `AppError` — the catch delegates to
 * `errorHandler.handleError`, which is `Promise<never>`. So a value of this type is
 * already proof the request succeeded.
 *
 * The previous shape carried `ok: boolean` and `error?: HttpError`, neither of which
 * any code path could ever populate. That is worse than merely redundant: it let a
 * caller write `if (!res.ok) { handle(res.error) }` and get a clean typecheck, a
 * clean build, and a branch that never runs, because the throw bypasses it. The
 * `HttpError` interface those fields referenced also collided with the `HttpError`
 * *class* in `shared/errors/AppError.ts`, which names the same field `statusCode`
 * rather than `status` — so reading `res.error.status` returned `undefined` and
 * still typechecked.
 *
 * If a caller needs failures as values rather than exceptions, add a `Result` wrapper
 * around `request` deliberately. Do not reinstate a flag nothing sets.
 */
export interface HttpResponse<T> {
    data?: T;
    status: number;
    headers?: Record<string, any>;
}
