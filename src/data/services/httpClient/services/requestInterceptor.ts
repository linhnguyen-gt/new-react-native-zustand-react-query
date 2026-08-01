import { type AxiosError, type AxiosInstance, HttpStatusCode, type InternalAxiosRequestConfig } from 'axios';

import { AuthError, TokenExpiredError } from '@/shared/errors';

import { type ITokenService } from '../interfaces/IHttpClient';

import { REFRESH_ENDPOINT } from './refresh-client';

interface ErrorResponseData {
    message: string;
    status?: number;
}

/** Carries the one-shot marker that stops a replayed request from refreshing again. */
interface RetryableRequestConfig extends InternalAxiosRequestConfig {
    _retry?: boolean;
}

/**
 * Whether a URL addresses the refresh endpoint itself.
 *
 * Matches the last path segment rather than a substring: a plain
 * `url.includes('refresh-token')` also swallows `/admin/refresh-token-audit` and
 * `/refresh-token-stats`, quietly denying those endpoints refresh-and-replay.
 */
const isRefreshEndpoint = (url?: string): boolean => {
    if (!url) return false;

    // `?? url` rather than a bare `[0]`: under `noUncheckedIndexedAccess` an index read is
    // `string | undefined`, and `split` genuinely can return an empty array for some
    // inputs. Falling back to the whole URL keeps the comparison below meaningful instead
    // of matching an empty path against the endpoint name.
    const path = (url.split('?')[0] ?? url).replace(/\/+$/, '');
    return path.split('/').pop() === REFRESH_ENDPOINT;
};

export class RequestInterceptor {
    // Declared and assigned rather than written as constructor parameter properties.
    // Parameter properties emit an assignment a type-stripping transpiler cannot produce,
    // which is what `erasableSyntaxOnly` forbids.
    private readonly axiosInstance: AxiosInstance;

    private readonly tokenService: ITokenService;

    constructor(axiosInstance: AxiosInstance, tokenService: ITokenService) {
        this.axiosInstance = axiosInstance;
        this.tokenService = tokenService;
    }

    setupInterceptors(): void {
        this.axiosInstance.interceptors.request.use(this.handleRequest.bind(this), this.handleRequestError.bind(this));

        this.axiosInstance.interceptors.response.use(this.handleResponse.bind(this), async (error: AxiosError) => {
            if (this.isTokenExpiredError(error) && this.isRetryable(error)) {
                const config = error.config as RetryableRequestConfig;

                // Mark before dispatching, not after. A replay that 401s again must fall
                // straight through to the rejection below; without this flag it re-enters
                // this branch and recurses until the heap is exhausted. Confirmed
                // empirically — an early test drove a persistent 401 through this chain
                // and OOM'd the jest worker after ~120s.
                config._retry = true;

                const refreshed = await this.tokenService.refreshToken();

                // Honour the result. The retry used to run unconditionally, so after a
                // failed refresh had already logged the user out it reissued the original
                // request with no credential — a guaranteed second 401 presented to the
                // caller as a transport error rather than an expired session.
                if (!refreshed) {
                    return Promise.reject(
                        new TokenExpiredError('Session expired, please login again', {
                            endpoint: error.config?.url,
                            method: error.config?.method?.toUpperCase(),
                        })
                    );
                }

                return this.axiosInstance.request(config);
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

    /**
     * Whether this failure may trigger a refresh-and-replay.
     *
     * Two exclusions, either of which alone leaves the recursion open:
     *
     * - a request already replayed once (`_retry`), so a still-failing credential
     *   terminates instead of looping;
     * - the refresh endpoint itself. The refresh now goes out on a separate
     *   interceptor-free client, so it should never reach here — this is the second
     *   line of defence for the day someone routes it back through the shared
     *   instance, which is exactly how the original recursion was built.
     *
     * `error.config` may be undefined when the request never got built; treating that
     * as non-retryable also removes the `!` assertion that used to sit on the replay.
     */
    private isRetryable(error: AxiosError): boolean {
        const config = error.config as RetryableRequestConfig | undefined;
        if (!config) return false;
        if (config._retry) return false;

        return !isRefreshEndpoint(config.url);
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
