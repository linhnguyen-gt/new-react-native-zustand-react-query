import axios, { AxiosInstance, AxiosRequestConfig } from "axios";

import { environment } from "../environment";

import ApiMethod from "./ApiMethod";
import { HttpRequestConfig, HttpResponse, IHttpClient } from "./interfaces/IHttpClient";
import { ErrorHandler } from "./services/ErrorHandler";
import { RequestInterceptor } from "./services/RequestInterceptor";
import { TokenService } from "./services/TokenService";

const DEFAULT_API_CONFIG = {
    baseURL: environment.apiBaseUrl,
    timeout: 30000
} as const;

export class HttpClient implements IHttpClient {
    private static _instance: HttpClient;

    // eslint-disable-next-line @typescript-eslint/naming-convention
    private readonly INSTANCE: AxiosInstance;

    private readonly tokenService: TokenService;

    private readonly errorHandler: ErrorHandler;

    private readonly requestInterceptor: RequestInterceptor;

    private timeoutId: number | null = null;

    private constructor(
        tokenService?: TokenService,
        errorHandler?: ErrorHandler,
        config: Partial<AxiosRequestConfig> = {}
    ) {
        this.INSTANCE = axios.create({
            baseURL: DEFAULT_API_CONFIG.baseURL,
            timeout: DEFAULT_API_CONFIG.timeout,
            // TODO: Uncomment this when the backend is ready to receive cookies
            // withCredentials: true,
            ...config
        });
        this.errorHandler = errorHandler ?? new ErrorHandler();
        this.tokenService = tokenService ?? new TokenService(this);
        this.requestInterceptor = new RequestInterceptor(this.INSTANCE, this.tokenService);
        this.requestInterceptor.setupInterceptors();
    }

    static getInstance(tokenService?: TokenService, errorHandler?: ErrorHandler): HttpClient {
        if (!HttpClient._instance) {
            HttpClient._instance = new HttpClient(tokenService, errorHandler);
        }
        return HttpClient._instance;
    }

    async request<T>(config: HttpRequestConfig): Promise<HttpResponse<T> | undefined> {
        try {
            const headers = { ...config.headers };

            const response = await this.INSTANCE.request<T>({
                url: config.endpoint,
                method: config.method.toLowerCase(),
                params: this.shouldIncludeParams(config.method) ? config.params : undefined,
                data: this.shouldIncludeBody(config.method) ? config.body : undefined,
                headers
            });

            return {
                ok: true,
                data: response.data,
                status: response.status,
                headers: response.headers
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
            this.INSTANCE.defaults.headers = {
                ...this.INSTANCE.defaults.headers,
                ...newHeaders
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
        this.INSTANCE.defaults.headers.Authorization = `Bearer ${accessToken}`;
    }

    public getInstance(): AxiosInstance {
        return this.INSTANCE;
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
