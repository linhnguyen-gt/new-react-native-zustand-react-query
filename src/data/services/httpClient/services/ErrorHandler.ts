import { AxiosError, HttpStatusCode } from 'axios';

import { apiProblem } from '../httpProblem';

import { Logger } from '@/shared/helper';

export interface IErrorHandler {
    handleError(error: AxiosError): Promise<never>;
    extractErrorData(error: AxiosError): Error;
}

export class ErrorHandler implements IErrorHandler {
    async handleError(error: AxiosError): Promise<never> {
        const errorData = this.extractErrorData(error);
        Logger.error('HttpError', {
            status: error.response?.status,
            data: error.response?.data,
            config: {
                url: error.config?.url,
                method: error.config?.method,
                headers: error.config?.headers,
            },
        });
        return Promise.reject(new Error(JSON.stringify(errorData)));
    }

    extractErrorData(error: AxiosError): Error {
        const errorResponse: ErrorResponse<Data> = {
            ok: false,
            data: error.response?.data || error.message || 'An unexpected error occurred',
            status: error.response?.status || HttpStatusCode.InternalServerError,
        };
        return new Error(JSON.stringify(apiProblem(errorResponse)));
    }
}
