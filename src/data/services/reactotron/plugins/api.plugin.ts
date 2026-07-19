import { HttpStatusCode } from 'axios';

import { ReactotronCore } from '../reactotron.core';

import { formatError } from './format-error';

export const apiPlugin = (core: ReactotronCore) => ({
    logRequest: (method: string, url: string, data?: object | null, headers?: object) => {
        core.log({
            type: 'API',
            name: `📤 ${method} ${url}`,
            preview: `API Request: ${method}`,
            value: {
                method,
                url,
                headers: headers || {},
                data: data || null,
                timestamp: new Date().toISOString(),
            },
            color: '#3498db',
        });
    },

    logResponse: (method: string, url: string, status: number, data?: object | null, duration?: number) => {
        let color = '#2ecc71';
        let icon = '✅';

        if (status >= HttpStatusCode.MultipleChoices && status < HttpStatusCode.BadRequest) {
            color = '#f39c12';
            icon = '↪️';
        } else if (status >= HttpStatusCode.BadRequest && status < HttpStatusCode.InternalServerError) {
            color = '#e67e22';
            icon = '⚠️';
        } else if (status >= HttpStatusCode.InternalServerError) {
            color = '#e74c3c';
            icon = '❌';
        }

        core.log({
            type: 'API',
            name: `📥 ${icon} ${method} ${url} (${status})`,
            preview: `Response: ${status} (${duration ? duration + 'ms' : 'unknown'})`,
            value: {
                method,
                url,
                status,
                statusText: getStatusText(status),
                data: data || null,
                duration: duration ? `${duration}ms` : 'unknown',
                timestamp: new Date().toISOString(),
            },
            important: status >= HttpStatusCode.BadRequest,
            color,
        });
    },

    logError: (method: string, url: string, error: any) => {
        core.log({
            type: 'API',
            name: `❌ ERROR: ${method} ${url}`,
            preview: error?.message || 'API Error',
            value: {
                method,
                url,
                error: formatError(error),
                timestamp: new Date().toISOString(),
            },
            important: true,
            color: '#e74c3c',
        });
    },
});

function getStatusText(status: number): string {
    const statusTexts: Record<number, string> = {
        [HttpStatusCode.Ok]: 'OK',
        [HttpStatusCode.Created]: 'Created',
        [HttpStatusCode.NoContent]: 'No Content',
        [HttpStatusCode.BadRequest]: 'Bad Request',
        [HttpStatusCode.Unauthorized]: 'Unauthorized',
        [HttpStatusCode.Forbidden]: 'Forbidden',
        [HttpStatusCode.NotFound]: 'Not Found',
        [HttpStatusCode.UnprocessableEntity]: 'Unprocessable Entity',
        [HttpStatusCode.InternalServerError]: 'Internal Server Error',
    };

    return statusTexts[status] || 'Unknown';
}
