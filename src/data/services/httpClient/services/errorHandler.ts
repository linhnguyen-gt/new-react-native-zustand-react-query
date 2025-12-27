import { AxiosError } from 'axios';

import { errorHandler } from '@/core/error';
import { HttpError } from '@/shared/errors';

export interface IErrorHandler {
    handleError(error: AxiosError): Promise<never>;
    extractErrorData(error: AxiosError): HttpError;
}

/**
 * HTTP error handler - uses unified error handler
 * Deprecated: Use errorHandler from @/core/error instead
 */
export class ErrorHandler implements IErrorHandler {
    async handleError(error: AxiosError): Promise<never> {
        const appError = errorHandler.handle(error, {
            endpoint: error.config?.url,
            method: error.config?.method?.toUpperCase(),
        });
        return Promise.reject(appError);
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
