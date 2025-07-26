import { HttpStatusCode } from 'axios';
import { Alert } from 'react-native';

import { Logger } from '@/shared/helper';

export const apiProblem = <T extends Data>(response: ErrorResponse<T>): ErrorResponse<T> => {
    try {
        const errorResponse: ErrorResponse<Data> = {
            ok: false,
            data: response.data,
            status: response.status,
        };
        showErrorDialog(errorResponse);
        return errorResponse;
    } catch (error) {
        if (__DEV__) {
            Logger.error('ApiProblem', 'Unexpected error:', error);
        }
        const unexpectedErrorResponse: ErrorResponse<Data> = {
            ok: false,
            data: response.data ?? 'An unexpected error occurred',
            status: HttpStatusCode.InternalServerError,
        };
        showErrorDialog(unexpectedErrorResponse);
        return unexpectedErrorResponse;
    }
};

const showErrorDialog = <T extends Data>(errorResponse: ErrorResponse<T>) => {
    Logger.error('ApiError', {
        status: errorResponse.status,
        data: errorResponse.data,
        timestamp: new Date().toISOString(),
    });

    let errorMessage = 'An unexpected error occurred';

    if (errorResponse.data && typeof errorResponse.data === 'object') {
        const errorData = errorResponse.data as { message?: string; error?: string };
        if (errorData.message) {
            errorMessage = errorData.message;
        } else if (errorData.error) {
            errorMessage = errorData.error;
        }
    } else if (typeof errorResponse.data === 'string') {
        errorMessage = errorResponse.data;
    }

    Alert.alert('Error', errorMessage, [{ text: 'Close', onPress: () => {} }], { cancelable: false });
};

declare global {
    type Data = Record<string, any> | string;

    type SuccessfulResponse<D extends Data, S = HttpStatusCode> = {
        ok: true;
        data?: D;
        status?: S;
    };

    type ErrorResponse<D extends Data, S = HttpStatusCode> = {
        ok: false;
        data: D | unknown;
        status?: S;
    };
    type BaseResponse<D extends Data> = SuccessfulResponse<D> | ErrorResponse<D> | undefined;
}
