import axios, { AxiosInstance } from 'axios';
import Config from 'react-native-config';

import ApiMethod from './apiMethod';
import { HttpRequestConfig, HttpResponse, IHttpClient } from './interfaces/IHttpClient';
import { ErrorHandler } from './services/errorHandler';
import { RequestInterceptor } from './services/requestInterceptor';
import { TokenService } from './services/tokenService';

const DEFAULT_API_CONFIG = {
    baseURL: Config.API_URL,
    timeout: 30000,
    headers: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
    },
} as const;

class RateLimiter {
    private requests: { [key: string]: number[] } = {};
    private readonly maxRequests = 100;
    private readonly windowMs = 60000;

    canMakeRequest(endpoint: string): boolean {
        const now = Date.now();
        const windowStart = now - this.windowMs;

        if (!this.requests[endpoint]) {
            this.requests[endpoint] = [];
        }

        this.requests[endpoint] = this.requests[endpoint].filter((time) => time > windowStart);

        if (this.requests[endpoint].length >= this.maxRequests) {
            return false;
        }

        this.requests[endpoint].push(now);
        return true;
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
            baseURL: DEFAULT_API_CONFIG.baseURL,
            timeout: DEFAULT_API_CONFIG.timeout,
            headers: DEFAULT_API_CONFIG.headers,
            // TODO: Uncomment this when the backend is ready to receive cookies
            // withCredentials: true,
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

    async request<T>(config: HttpRequestConfig): Promise<HttpResponse<T> | undefined> {
        try {
            this.validateRequest(config);

            const headers = { ...config.headers };

            const response = await this.INSTANCE.request<T>({
                url: config.endpoint,
                method: config.method.toLowerCase(),
                params: this.shouldIncludeParams(config.method) ? config.params : undefined,
                data: this.shouldIncludeBody(config.method) ? config.body : undefined,
                headers,
            });

            return {
                ok: true,
                data: response.data,
                status: response.status,
                headers: response.headers,
            };
        } catch (e) {
            this.errorHandler.handleError(e);
            return;
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
