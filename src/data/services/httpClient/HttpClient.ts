import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from "axios";

import { environment } from "../environment";

import ApiMethod from "./ApiMethod";
import { IHttpClient } from "./interfaces/IHttpClient";
import { ErrorHandler, IErrorHandler } from "./services/ErrorHandler";
import { ITokenService, TokenService } from "./services/TokenService";

const DEFAULT_API_CONFIG = {
    baseURL: environment.apiBaseUrl
} as const;

const _methodRes = [ApiMethod.GET, ApiMethod.DELETE];

class HttpClient implements IHttpClient {
    private static _instance: HttpClient;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    private readonly INSTANCE: AxiosInstance;
    private readonly tokenService: ITokenService;
    private readonly errorHandler: IErrorHandler;

    private constructor(
        tokenService: ITokenService = new TokenService(),
        errorHandler: IErrorHandler = new ErrorHandler()
    ) {
        this.INSTANCE = axios.create({
            baseURL: DEFAULT_API_CONFIG.baseURL
        });
        this.tokenService = tokenService;
        this.errorHandler = errorHandler;
        this.setInterceptors();
    }

    static getInstance(tokenService?: ITokenService, errorHandler?: IErrorHandler): HttpClient {
        if (!HttpClient._instance) {
            HttpClient._instance = new HttpClient(tokenService, errorHandler);
        }
        return HttpClient._instance;
    }

    async request<
        Data extends Record<string, any>,
        Method extends ApiMethod,
        Body = Record<string, any>,
        Params = Record<string, any>
    >(
        endpoint: string,
        apiConfig: ApiClientConfig<Body, Params, Method>,
        config?: AxiosRequestConfig
    ): Promise<BaseResponse<Data>> {
        const { method, params, body } = apiConfig;

        try {
            const res = await this.INSTANCE.request<Data>({
                method: method.toLowerCase(),
                url: endpoint,
                params: _methodRes.includes(method) ? params : undefined,
                data: !_methodRes.includes(method) ? body : undefined,
                ...config
            });

            return {
                ok: true,
                data: res.data,
                status: res.status
            };
        } catch (e) {
            return;
        }
    }

    private setInterceptors(): void {
        this.INSTANCE.interceptors.request.use(this.requestInterceptor.bind(this));

        this.INSTANCE.interceptors.response.use((response) => response, this.responseErrorInterceptor.bind(this));
    }

    // update headers if needed
    updateHeaders(newHeaders: Record<string, string>): void {
        if (this.INSTANCE) {
            this.INSTANCE.defaults.headers = {
                ...this.INSTANCE.defaults.headers,
                ...newHeaders
            };
        }
    }

    private async requestInterceptor(config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> {
        const token = await this.tokenService.getToken();
        if (token) {
            config.headers = config.headers || {};
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    }

    private async responseErrorInterceptor(error: AxiosError): Promise<AxiosResponse> {
        if (
            error.response?.status === 401 &&
            error.response.data &&
            typeof error.response.data === "object" &&
            "message" in error.response.data &&
            error.response.data.message === "Unauthorized"
        ) {
            try {
                await this.tokenService.refreshToken();
                return this.INSTANCE.request(error.config!);
            } catch (refreshError) {
                return this.errorHandler.handleError(refreshError as AxiosError);
            }
        }
        return this.errorHandler.handleError(error);
    }
}

export default HttpClient.getInstance();

declare global {
    type HttpClientBaseConfig<M extends ApiMethod, P = Record<string, any>, B = Record<string, any>> = {
        method: M;
        params?: P;
        body?: B;
    };

    type ApiClientConfig<B, P, M extends ApiMethod> = M extends ApiMethod.GET | ApiMethod.DELETE
        ? HttpClientBaseConfig<M, P>
        : HttpClientBaseConfig<M, P, B>;
}
