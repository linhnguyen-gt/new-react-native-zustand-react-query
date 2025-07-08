import { AxiosError, AxiosInstance, HttpStatusCode } from "axios";

import { ITokenService } from "../interfaces/IHttpClient";

interface ErrorResponseData {
    message: string;
    status?: number;
}

export class RequestInterceptor {
    constructor(
        private readonly axiosInstance: AxiosInstance,
        private readonly tokenService: ITokenService
    ) {}

    setupInterceptors(): void {
        this.axiosInstance.interceptors.request.use(this.handleRequest.bind(this), this.handleRequestError.bind(this));

        this.axiosInstance.interceptors.response.use(this.handleResponse.bind(this), async (error: AxiosError) => {
            if (this.isTokenExpiredError(error)) {
                try {
                    await this.tokenService.refreshToken();
                    return this.axiosInstance.request(error.config!);
                } catch (refreshError) {
                    return Promise.reject({
                        message: "Session expired, please login again",
                        status: HttpStatusCode.Unauthorized,
                        code: "TOKEN_EXPIRED"
                    });
                }
            }

            if (this.isUserNotFoundError(error)) {
                await this.tokenService.logout();
                return Promise.reject({
                    message: "Account not found, please login again",
                    status: HttpStatusCode.BadRequest,
                    code: "USER_NOT_FOUND"
                });
            }

            if (error.response?.data) {
                const errorData = error.response.data as ErrorResponseData;
                return Promise.reject({
                    ...error,
                    message: errorData.message,
                    status: error.response.status
                });
            }

            return Promise.reject(error);
        });
    }

    private async handleRequest(config: any) {
        // TODO: Add request handling logic (logging, metrics, etc.)
        return config;
    }

    private handleRequestError(error: AxiosError) {
        return Promise.reject(error);
    }

    private handleResponse(response: any) {
        return response;
    }

    private isTokenExpiredError(error: AxiosError): boolean {
        const errorData = error.response?.data as ErrorResponseData;
        return (
            error.response?.status === HttpStatusCode.Unauthorized &&
            errorData?.message?.toLowerCase().includes("token expired")
        );
    }

    private isUserNotFoundError(error: AxiosError): boolean {
        const errorData = error.response?.data as ErrorResponseData;
        return (
            error.response?.status === HttpStatusCode.BadRequest &&
            errorData?.message?.toLowerCase().includes("user not found")
        );
    }
}
