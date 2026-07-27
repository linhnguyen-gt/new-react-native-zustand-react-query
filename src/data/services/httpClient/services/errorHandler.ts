import { AxiosError } from 'axios';

import { errorHandler } from '@/core/error';

/**
 * HTTP error handler - uses unified error handler
 * Deprecated: Use errorHandler from @/core/error instead
 */
export class ErrorHandler {
    async handleError(error: unknown): Promise<never> {
        // `unknown`, not AxiosError: the catch that calls this receives whatever was
        // thrown, including validation errors raised before the request is dispatched.
        const axiosError = error instanceof AxiosError ? error : undefined;
        const appError = errorHandler.handle(error, {
            endpoint: axiosError?.config?.url,
            method: axiosError?.config?.method?.toUpperCase(),
        });
        throw appError;
    }
}
