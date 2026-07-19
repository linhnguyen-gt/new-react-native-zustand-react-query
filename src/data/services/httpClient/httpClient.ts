import axios, { AxiosInstance } from 'axios';

import { appConfig, networkConfig } from '@/shared/config/appConfig';
import { assertValidApiUrl } from '@/shared/config/api-url';

import ApiMethod from './apiMethod';
import { HttpRequestConfig, HttpResponse, IHttpClient } from './interfaces/IHttpClient';
import { ErrorHandler } from './services/errorHandler';
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

class RateLimiter {
    private requests: { [key: string]: number[] } = {};
    private readonly maxRequests = networkConfig.maxRequestsPerWindow;
    private readonly windowMs = networkConfig.rateLimitWindowMs;

    canMakeRequest(endpoint: string): boolean {
        const now = Date.now();
        const windowStart = now - this.windowMs;

        const recent = (this.requests[endpoint] ?? []).filter((time) => time > windowStart);

        if (recent.length >= this.maxRequests) {
            this.requests[endpoint] = recent;
            return false;
        }

        recent.push(now);
        this.requests[endpoint] = recent;

        // Endpoints are templated — `posts/1`, `posts/2`, … — so this map is keyed by
        // resolved URL and grows without bound as a user browses. Each key holds a
        // timestamp array that empties once its window passes but is never removed, so
        // a long session leaks one entry per distinct resource touched. Dropping keys
        // whose window has fully drained bounds it to endpoints actually in use.
        this.pruneExpired(windowStart);

        return true;
    }

    private pruneExpired(windowStart: number): void {
        for (const key of Object.keys(this.requests)) {
            const timestamps = this.requests[key];
            if (timestamps.length === 0 || timestamps[timestamps.length - 1] <= windowStart) {
                delete this.requests[key];
            }
        }
    }

    /** Live key count, for the test that pins the bound. */
    get trackedEndpointCount(): number {
        return Object.keys(this.requests).length;
    }
}

export class HttpClient implements IHttpClient {
    private static _instance: HttpClient;

    private readonly INSTANCE: AxiosInstance;

    private readonly tokenService: TokenService;

    private readonly errorHandler: ErrorHandler;

    private readonly requestInterceptor: RequestInterceptor;

    private readonly rateLimiter: RateLimiter;

    private timeoutId: number | null = null;

    private constructor(tokenService?: TokenService, errorHandler?: ErrorHandler) {
        this.INSTANCE = axios.create({
            // Validated, not defaulted. This used to be a hardcoded
            // jsonplaceholder.typicode.com while `appConfig.apiUrl` — fully plumbed from
            // API_URL through app.config.ts — had zero consumers. Throwing here means a
            // misconfigured build fails at startup with a message naming the variable,
            // rather than silently issuing relative requests to nowhere.
            baseURL: assertValidApiUrl(appConfig.apiUrl, appConfig.variant),
            timeout: DEFAULT_API_CONFIG.timeout,
            // Note: withCredentials will be enabled when backend supports it
        });
        this.errorHandler = errorHandler ?? new ErrorHandler();
        this.tokenService = tokenService ?? new TokenService(this);
        this.requestInterceptor = new RequestInterceptor(this.INSTANCE, this.tokenService);
        this.rateLimiter = new RateLimiter();
        this.requestInterceptor.setupInterceptors();
    }

    static getInstance(tokenService?: TokenService, errorHandler?: ErrorHandler): HttpClient {
        if (!HttpClient._instance) {
            HttpClient._instance = new HttpClient(tokenService, errorHandler);
        }
        return HttpClient._instance;
    }

    private validateRequest(config: HttpRequestConfig): void {
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

        if (!this.rateLimiter.canMakeRequest(config.endpoint)) {
            throw new Error('Rate limit exceeded');
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
            // handleError classifies and throws (Promise<never>). Awaiting it
            // propagates the typed AppError; dropping the promise here would both
            // swallow the error and leave an unhandled rejection.
            return await this.errorHandler.handleError(e);
        }
    }

    private shouldIncludeParams(method: ApiMethod): boolean {
        return [ApiMethod.GET].includes(method);
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

declare global {
    type HttpClientBaseConfig<M extends ApiMethod, P = Record<string, any>, B = Record<string, any>> = {
        method: M;
        params?: P;
        body?: B;
        headers?: Record<string, string>;
    };

    type ApiClientConfig<B, P, M extends ApiMethod> = M extends ApiMethod.GET | ApiMethod.DELETE
        ? HttpClientBaseConfig<M, P>
        : HttpClientBaseConfig<M, P, B>;
}
