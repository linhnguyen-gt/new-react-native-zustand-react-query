import ApiMethod from "../ApiMethod";

export interface Session {
    accessToken?: string;
    refreshToken?: string;
    expiredAt?: number;
}

type BaseHttpRequestConfig = {
    endpoint: string;
    method: ApiMethod;
    headers?: Record<string, string>;
    timeout?: number;
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
    request<T>(config: HttpRequestConfig): Promise<HttpResponse<T> | undefined>;
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

export interface HttpResponse<T> {
    ok: boolean;
    data?: T;
    error?: HttpError;
    status: number;
    headers?: Record<string, any>;
}

export interface HttpError {
    message: string;
    code?: string;
    status?: number;
}
