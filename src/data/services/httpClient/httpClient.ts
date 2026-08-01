import axios, { type AxiosInstance } from 'axios';

import { appConfig, networkConfig } from '@/shared/config/appConfig';
import { assertValidApiUrl } from '@/shared/config/api-url';
import { Logger } from '@/shared/helper';

import ApiMethod from './apiMethod';
import { type HttpRequestConfig, type HttpResponse, type IHttpClient } from './interfaces/IHttpClient';
import { rethrowAsAppError } from './services/errorHandler';
import { RequestInterceptor } from './services/requestInterceptor';
import { TokenService } from './services/tokenService';

/**
 * No `headers` block here on purpose.
 *
 * It used to send `X-Content-Type-Options`, `X-Frame-Options` and `X-XSS-Protection`
 * on every outbound request. Those are **response** headers: a server sends them to
 * instruct a browser. Sent from a client they instruct nobody, and this is a native
 * app with no browser in the loop at all. They only ever added bytes to every request
 * while reading like a security measure.
 */
const DEFAULT_API_CONFIG = {
    timeout: networkConfig.timeoutMs,
} as const;

/**
 * There is deliberately no client-side rate limiter here.
 *
 * One used to live in this file: 100 requests per 60-second window, keyed by endpoint.
 * It was removed rather than tuned, because neither half of it worked.
 *
 * It could not protect the server. Each device counts only its own traffic, so the
 * limit a server actually experiences is (devices × 100), which is not a limit. Rate
 * limiting is enforced where the requests converge, and that is never the client.
 *
 * It also did not limit what it appeared to. The key was the *resolved* endpoint, so
 * `posts/1` … `posts/100` were a hundred separate buckets of a hundred requests each.
 * It could only ever trip on a hot loop hammering one identical URL — a bug the limiter
 * would mask rather than surface.
 *
 * What remained was a map and a prune sweep on every request, plus a bare
 * `Error('Rate limit exceeded')` that no `RateLimitError` class ever backed, so it
 * reached the UI through the error handler's string heuristics.
 *
 * If a real budget is ever needed, it belongs in the server's 429 response and the
 * retry strategy that already handles it (`core/error/ErrorHandler.ts`).
 */

export class HttpClient implements IHttpClient {
    private static _instance: HttpClient;

    private readonly INSTANCE: AxiosInstance;

    private readonly tokenService: TokenService;

    private readonly requestInterceptor: RequestInterceptor;

    /**
     * The base-URL rejection, deferred rather than thrown.
     *
     * `assertValidApiUrl` used to run inside this constructor, and the module's last
     * line calls `getInstance()` — so validation happened during *module evaluation*.
     * `data/services/index.ts` re-exports this client and `navigator/AppStack.tsx`
     * imports `RootNavigator` from that same barrel, which put a misconfigured
     * `API_URL` on the import path of the navigator itself. The throw landed before
     * `ErrorBoundary` had mounted, so the diagnostic message the validator works so
     * hard to write reached nobody: the user got a white screen.
     *
     * Holding the error and re-throwing it from `request()` keeps every guarantee the
     * validator provides — no request is ever dispatched against an unusable base URL —
     * while turning a crash-on-import into an ordinary rejected request that React
     * Query surfaces as an error state, with the message intact.
     */
    private readonly baseUrlError: Error | null = null;

    private timeoutId: number | null = null;

    private constructor(tokenService?: TokenService) {
        let baseURL = '';

        try {
            // Validated, not defaulted. This used to be a hardcoded
            // jsonplaceholder.typicode.com while `appConfig.apiUrl` — fully plumbed from
            // API_URL through app.config.ts — had zero consumers.
            baseURL = assertValidApiUrl(appConfig.apiUrl, appConfig.variant);
        } catch (error) {
            this.baseUrlError = error as Error;
            Logger.error('HttpClient', 'Invalid API_URL; every request will be rejected', error);
        }

        this.INSTANCE = axios.create({
            baseURL,
            timeout: DEFAULT_API_CONFIG.timeout,
            // Note: withCredentials will be enabled when backend supports it
        });
        this.tokenService = tokenService ?? new TokenService(this);
        this.requestInterceptor = new RequestInterceptor(this.INSTANCE, this.tokenService);
        this.requestInterceptor.setupInterceptors();
    }

    /**
     * @param tokenService honoured **only** on the call that constructs the instance. The
     * module's final line calls this with no arguments, so in the running app that call is
     * always the first one and the parameter is unreachable — it exists for tests, which
     * must call `resetInstance()` first. Passing it to a later call warns rather than
     * silently doing nothing, matching `UnifiedErrorHandler.getInstance`.
     *
     * The `errorHandler` parameter that sat beside this one is gone: error classification
     * is now the module-level `rethrowAsAppError`, which holds no state worth swapping.
     */
    static getInstance(tokenService?: TokenService): HttpClient {
        if (!HttpClient._instance) {
            HttpClient._instance = new HttpClient(tokenService);
            return HttpClient._instance;
        }

        if (tokenService) {
            Logger.warn(
                'HttpClient',
                'getInstance() called with a tokenService after the instance already exists; it is ignored. Call resetInstance() first.'
            );
        }

        return HttpClient._instance;
    }

    /** Drops the singleton so a test can construct one with its own dependencies. */
    static resetInstance(): void {
        HttpClient._instance = undefined as unknown as HttpClient;
    }

    private validateRequest(config: HttpRequestConfig): void {
        // First, before any other check: with no usable base URL every request resolves
        // relative to nothing, and the transport error that follows names the endpoint
        // rather than the misconfigured variable.
        if (this.baseUrlError) {
            throw this.baseUrlError;
        }

        if (!config.endpoint || typeof config.endpoint !== 'string') {
            throw new Error('Invalid endpoint');
        }

        const dangerousPatterns = [/\.\./, /\/etc\//, /\/proc\//, /\/sys\//];

        for (const pattern of dangerousPatterns) {
            if (pattern.test(config.endpoint)) {
                throw new Error('Potentially dangerous endpoint detected');
            }
        }

        if (!Object.values(ApiMethod).includes(config.method)) {
            throw new Error('Invalid HTTP method');
        }
    }

    async request<T>(config: HttpRequestConfig): Promise<HttpResponse<T>> {
        try {
            this.validateRequest(config);

            const headers = { ...config.headers };

            const response = await this.INSTANCE.request<T>({
                url: config.endpoint,
                method: config.method.toLowerCase(),
                params: this.shouldIncludeParams(config.method) ? config.params : undefined,
                data: this.shouldIncludeBody(config.method) ? config.body : undefined,
                headers,
                // Both were declared on HttpRequestConfig and forwarded nowhere, so a
                // caller could set them and watch nothing happen. `timeout` falls back
                // to the instance default when absent; `signal` is what makes React
                // Query's cancellation more than decorative.
                timeout: config.timeout,
                signal: config.signal,
            });

            return {
                data: response.data,
                status: response.status,
                headers: response.headers,
            };
        } catch (e) {
            // rethrowAsAppError classifies and throws (Promise<never>). Awaiting it
            // propagates the typed AppError; dropping the promise here would both
            // swallow the error and leave an unhandled rejection.
            return await rethrowAsAppError(e);
        }
    }

    private shouldIncludeParams(method: ApiMethod): boolean {
        // A direct comparison, not `[ApiMethod.GET].includes(method)`. With `ApiMethod` as
        // a const object the array literal narrows to `'GET'[]`, and `includes` then
        // refuses any other method — a type error that the old `enum` widened away.
        return method === ApiMethod.GET;
    }

    private shouldIncludeBody(method: ApiMethod): boolean {
        return !this.shouldIncludeParams(method);
    }

    updateHeaders(newHeaders: Record<string, string>): void {
        if (this.INSTANCE) {
            const safeHeaders = { ...newHeaders };
            const dangerousHeaders = ['host', 'origin', 'referer'];

            dangerousHeaders.forEach((header) => {
                delete safeHeaders[header];
            });

            this.INSTANCE.defaults.headers = {
                ...this.INSTANCE.defaults.headers,
                ...safeHeaders,
            };
        }
    }

    clearSession(): void {
        delete this.INSTANCE.defaults.headers.Authorization;
    }

    /**
     * The shared instance's baseURL, so the refresh client can target the same host
     * without a second source of truth for it.
     */
    getBaseURL(): string | undefined {
        return this.INSTANCE.defaults.baseURL;
    }

    clearRefreshTokenTimeout(): void {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
    }

    setRefreshTokenTimeout(timeoutId: number): void {
        this.timeoutId = timeoutId;
    }

    public getTokenService(): TokenService {
        return this.tokenService;
    }

    public setAccessToken(accessToken?: string): void {
        if (accessToken) {
            if (!accessToken.match(/^[A-Za-z0-9\-._~+/]+=*$/)) {
                throw new Error('Invalid token format');
            }
            this.INSTANCE.defaults.headers.Authorization = `Bearer ${accessToken}`;
        } else {
            delete this.INSTANCE.defaults.headers.Authorization;
        }
    }
}

export default HttpClient.getInstance();

// `HttpClientBaseConfig` and `ApiClientConfig` used to be declared global here. Neither
// had a single consumer anywhere in the repo — being ambient, nothing had to import them,
// so nothing ever revealed them as dead. `HttpRequestConfig` in `interfaces/IHttpClient.ts`
// is the type that actually describes a request, and it is imported like an ordinary type.
