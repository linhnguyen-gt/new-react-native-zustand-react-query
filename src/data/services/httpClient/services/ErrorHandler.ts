import { AxiosError, HttpStatusCode } from "axios";

import { apiProblem } from "../HttpProblem";

export interface IErrorHandler {
    handleError(error: AxiosError): Promise<never>;
    extractErrorData(error: AxiosError): Error;
}

export class ErrorHandler implements IErrorHandler {
    async handleError(error: AxiosError): Promise<never> {
        return Promise.reject(new Error(JSON.stringify(this.extractErrorData(error))));
    }

    extractErrorData(error: AxiosError): Error {
        const errorResponse: ErrorResponse<Data> = {
            ok: false,
            data: error.response?.data,
            status: error.response?.status || HttpStatusCode.InternalServerError
        };
        return new Error(JSON.stringify(apiProblem(errorResponse)));
    }
}
