import { AxiosError } from 'axios';

import { errorHandler } from '@/core/error';
import { HttpError } from '@/shared/errors';

export interface IErrorHandler {
    // `unknown`, not AxiosError: the catch that calls this receives whatever was
    // thrown, including validation errors raised before the request is dispatched.
    handleError(error: unknown): Promise<never>;
    extractErrorData(error: AxiosError): HttpError;
}

/**
 * HTTP error handler - uses unified error handler
 * Deprecated: Use errorHandler from @/core/error instead
 */
export class ErrorHandler implements IErrorHandler {
    async handleError(error: unknown): Promise<never> {
        const axiosError = error instanceof AxiosError ? error : undefined;
        const appError = errorHandler.handle(error, {
            endpoint: axiosError?.config?.url,
            method: axiosError?.config?.method?.toUpperCase(),
        });
        throw appError;
    }

    extractErrorData(error: AxiosError): HttpError {
        const status = error.response?.status || 500;
        const data = error.response?.data;
        const message = this.extractMessage(data) || error.message || 'HTTP request failed';

        return new HttpError(message, status, data, {
            endpoint: error.config?.url,
            method: error.config?.method?.toUpperCase(),
        });
    }

    private extractMessage(data: any): string | null {
        if (!data) return null;
        if (typeof data === 'string') return data;
        if (typeof data === 'object') {
            return data.message || data.error || data.msg || data.detail || null;
        }
        return null;
    }
}
