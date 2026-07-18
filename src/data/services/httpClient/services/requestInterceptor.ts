import { AxiosError, AxiosInstance, HttpStatusCode } from 'axios';

import { AuthError, TokenExpiredError } from '@/shared/errors';

import { ITokenService } from '../interfaces/IHttpClient';

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
                } catch {
                    return Promise.reject(
                        new TokenExpiredError('Session expired, please login again', {
                            endpoint: error.config?.url,
                            method: error.config?.method?.toUpperCase(),
                        })
                    );
                }
            }

            if (this.isUserNotFoundError(error)) {
                await this.tokenService.logout();
                return Promise.reject(
                    new AuthError('Account not found, please login again', {
                        endpoint: error.config?.url,
                        method: error.config?.method?.toUpperCase(),
                    })
                );
            }

            // Reject the original AxiosError rather than a spread copy. A spread drops
            // the prototype, so downstream `instanceof AxiosError` checks fail and the
            // error degrades to the String(error) fallback ("[object Object]").
            // The server message is read off error.response.data downstream by
            // extractErrorMessage, so error.message is left intact as the carrier of
            // the transport-level status text.
            return Promise.reject(error);
        });
    }

    private async handleRequest(config: any) {
        // Add request handling logic (logging, metrics, etc.)
        // This can be extended for request monitoring and analytics
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
            errorData?.message?.toLowerCase().includes('token expired')
        );
    }

    private isUserNotFoundError(error: AxiosError): boolean {
        const errorData = error.response?.data as ErrorResponseData;
        return (
            error.response?.status === HttpStatusCode.BadRequest &&
            errorData?.message?.toLowerCase().includes('user not found')
        );
    }
}
