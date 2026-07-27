import { AxiosError } from 'axios';

import { AppError, AuthError, ErrorCode, HttpError, NetworkError, TimeoutError } from '@/shared/errors';
import { UnifiedErrorHandler } from '../ErrorHandler';

describe('UnifiedErrorHandler', () => {
    let handler: UnifiedErrorHandler;

    beforeEach(() => {
        handler = UnifiedErrorHandler.getInstance({
            enableConsoleLogging: false,
            enableSentry: false,
        });
        handler.clearBreadcrumbs();
    });

    describe('Singleton pattern', () => {
        it('should return same instance', () => {
            const handler1 = UnifiedErrorHandler.getInstance();
            const handler2 = UnifiedErrorHandler.getInstance();

            expect(handler1).toBe(handler2);
        });
    });

    describe('Error categorization', () => {
        it('should handle AppError directly', () => {
            const appError = new NetworkError('Network failed');
            const result = handler.handle(appError);

            expect(result).toBe(appError);
            expect(result.code).toBe(ErrorCode.NETWORK_ERROR);
        });

        it('should handle native Error', () => {
            const nativeError = new Error('Test error');
            const result = handler.handle(nativeError);

            expect(result instanceof AppError).toBe(true);
            expect(result.message).toBe('Test error');
        });

        it('should handle unknown error', () => {
            const result = handler.handle('Unknown error string');

            expect(result instanceof AppError).toBe(true);
            expect(result.code).toBe(ErrorCode.UNKNOWN_ERROR);
        });

        it('should handle Axios network error', () => {
            const axiosError = new AxiosError('Network Error');
            axiosError.code = 'ECONNABORTED';

            const result = handler.handle(axiosError);

            expect(result instanceof TimeoutError).toBe(true);
        });

        it('should handle Axios HTTP error', () => {
            const axiosError = new AxiosError('Bad Request');
            axiosError.response = {
                status: 400,
                data: { message: 'Invalid input' },
                statusText: 'Bad Request',
                headers: {},
                config: {} as any,
            };

            const result = handler.handle(axiosError);

            expect(result instanceof HttpError).toBe(true);
            expect((result as HttpError).statusCode).toBe(400);
        });

        it('should handle Axios 401 error', () => {
            const axiosError = new AxiosError('Unauthorized');
            axiosError.response = {
                status: 401,
                data: { message: 'Invalid credentials' },
                statusText: 'Unauthorized',
                headers: {},
                config: {} as any,
            };

            const result = handler.handle(axiosError);

            expect(result instanceof HttpError).toBe(true);
            expect(result.recoveryStrategy.shouldLogout).toBe(true);
        });
    });

    describe('Error context', () => {
        it('should preserve context information', () => {
            const context = {
                endpoint: '/api/users',
                method: 'POST',
            };
            const error = new Error('Test error');
            const result = handler.handle(error, context);

            expect(result.context.endpoint).toBe('/api/users');
            expect(result.context.method).toBe('POST');
        });

        it('should extract context from Axios error', () => {
            const axiosError = new AxiosError('Network Error');
            axiosError.config = {
                url: '/api/test',
                method: 'get',
            } as any;

            const result = handler.handle(axiosError);

            expect(result.context.endpoint).toBe('/api/test');
            expect(result.context.method).toBe('GET');
        });
    });

    describe('Breadcrumbs', () => {
        it('should add breadcrumb', () => {
            handler.addBreadcrumb('Test breadcrumb');

            const breadcrumbs = handler.getBreadcrumbs();
            expect(breadcrumbs).toHaveLength(1);
            expect(breadcrumbs[0].message).toBe('Test breadcrumb');
        });

        it('should add breadcrumb on error', () => {
            const error = new Error('Test error');
            handler.handle(error);

            const breadcrumbs = handler.getBreadcrumbs();
            expect(breadcrumbs.length).toBeGreaterThan(0);
        });

        it('should limit breadcrumbs to max', () => {
            for (let i = 0; i < 100; i++) {
                handler.addBreadcrumb(`Breadcrumb ${i}`);
            }

            const breadcrumbs = handler.getBreadcrumbs();
            expect(breadcrumbs.length).toBeLessThanOrEqual(50);
        });

        it('should clear breadcrumbs', () => {
            handler.addBreadcrumb('Test');
            handler.clearBreadcrumbs();

            const breadcrumbs = handler.getBreadcrumbs();
            expect(breadcrumbs).toHaveLength(0);
        });
    });

    describe('Error callbacks', () => {
        beforeEach(() => {
            UnifiedErrorHandler.resetInstance();
        });

        it('should call onError callback', () => {
            const onError = jest.fn();
            const handler2 = UnifiedErrorHandler.getInstance({
                enableConsoleLogging: false,
                onError,
            });

            const error = new Error('Test error');
            handler2.handle(error);

            expect(onError).toHaveBeenCalled();
        });

        it('should call onAuthError callback for auth errors', () => {
            const onAuthError = jest.fn();
            const handler2 = UnifiedErrorHandler.getInstance({
                enableConsoleLogging: false,
                onAuthError,
            });

            const error = new AuthError('Auth failed');
            handler2.handle(error);

            expect(onAuthError).toHaveBeenCalled();
        });

        it('should call onNetworkError callback for network errors', () => {
            const onNetworkError = jest.fn();
            const handler2 = UnifiedErrorHandler.getInstance({
                enableConsoleLogging: false,
                onNetworkError,
            });

            const error = new NetworkError('Network failed');
            handler2.handle(error);

            expect(onNetworkError).toHaveBeenCalled();
        });
    });

    describe('Configuration', () => {
        it('should update configuration', () => {
            const handler2 = UnifiedErrorHandler.getInstance();
            handler2.updateConfig({
                enableConsoleLogging: true,
                enableSentry: true,
            });

            // Configuration updated (internal state)
            expect(handler2).toBeDefined();
        });
    });

    describe('Error message extraction', () => {
        it('should extract message from string', () => {
            const axiosError = new AxiosError('Error');
            axiosError.response = {
                status: 400,
                data: 'Invalid input',
                statusText: 'Bad Request',
                headers: {},
                config: {} as any,
            };

            const result = handler.handle(axiosError);

            expect(result.message).toContain('Invalid input');
        });

        it('should not surface an HTML error page as the message', () => {
            // Verbatim body served by nginx for the 502 reproduced on device. Returning it
            // put the whole document on screen under the app's "Error Occurred" heading,
            // leaking the server version and OS to the user.
            const gatewayHtml =
                '<html>\r\n<head><title>502 Bad Gateway</title></head>\r\n<body>\r\n' +
                '<center><h1>502 Bad Gateway</h1></center>\r\n<hr><center>nginx/1.18.0 (Ubuntu)</center>\r\n' +
                '</body>\r\n</html>\r\n';

            const axiosError = new AxiosError('Request failed with status code 502');
            axiosError.response = {
                status: 502,
                data: gatewayHtml,
                statusText: 'Bad Gateway',
                headers: {},
                config: {} as any,
            };

            const result = handler.handle(axiosError);

            expect(result.message).not.toContain('<html>');
            expect(result.message).not.toContain('nginx');
            expect(result.message).toBe('Request failed with status code 502');
        });

        it('should reject a string body too long to be a human-written message', () => {
            const axiosError = new AxiosError('Request failed with status code 500');
            axiosError.response = {
                status: 500,
                data: 'x'.repeat(201),
                statusText: 'Internal Server Error',
                headers: {},
                config: {} as any,
            };

            const result = handler.handle(axiosError);

            expect(result.message).toBe('Request failed with status code 500');
        });

        it('should extract message from object', () => {
            const axiosError = new AxiosError('Error');
            axiosError.response = {
                status: 400,
                data: { message: 'Invalid email' },
                statusText: 'Bad Request',
                headers: {},
                config: {} as any,
            };

            const result = handler.handle(axiosError);

            expect(result.message).toContain('Invalid email');
        });

        it('should extract error field from object', () => {
            const axiosError = new AxiosError('Error');
            axiosError.response = {
                status: 400,
                data: { error: 'Bad request' },
                statusText: 'Bad Request',
                headers: {},
                config: {} as any,
            };

            const result = handler.handle(axiosError);

            expect(result.message).toContain('Bad request');
        });
    });
});
