import axios, {
    AxiosError,
    AxiosInstance,
    AxiosRequestConfig,
    AxiosResponse,
    HttpStatusCode,
    InternalAxiosRequestConfig
} from "axios";

import { environment } from "../environment";

import ApiMethod from "./ApiMethod";
import { apiProblem } from "./HttpProblem";

const DEFAULT_API_CONFIG = {
    baseURL: environment.apiBaseUrl
} as const;

const _methodRes = [ApiMethod.GET, ApiMethod.DELETE];

class HttpClient {
    private static _instance: HttpClient;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    private readonly INSTANCE: AxiosInstance;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    private TOKEN?: string;

    private constructor() {
        this.INSTANCE = axios.create({
            baseURL: DEFAULT_API_CONFIG.baseURL
        });
        this.setInterceptors();
    }

    static getInstance(): HttpClient {
        if (!HttpClient._instance) {
            HttpClient._instance = new HttpClient();
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

    private requestInterceptor(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
        this.TOKEN = "token"; // Consider implementing proper token management
        if (this.TOKEN) {
            config.headers = config.headers || {};
            config.headers.Authorization = `Bearer ${this.TOKEN}`;
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
                await this.refreshToken();
                return this.INSTANCE.request(error.config!);
            } catch (refreshError) {
                return Promise.reject(new Error(JSON.stringify(this.extractErrorData(refreshError))));
            }
        }
        return Promise.reject(new Error(JSON.stringify(this.extractErrorData(error))));
    }

    private extractErrorData(error: AxiosError): Error {
        const errorResponse: ErrorResponse<Data> = {
            ok: false,
            data: error.response?.data,
            status: error.response?.status || HttpStatusCode.InternalServerError
        };
        return new Error(JSON.stringify(apiProblem(errorResponse)));
    }

    private async refreshToken(): Promise<void> {
        // Implement token refresh logic
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
