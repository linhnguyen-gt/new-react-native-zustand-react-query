import axios, { AxiosError, AxiosInstance } from 'axios';

import { errorHandler } from '@/core/error';
import { AppError, ErrorCode } from '@/shared/errors';

import { ITokenService } from '../interfaces/IHttpClient';
import { ErrorHandler } from '../services/errorHandler';
import { RequestInterceptor } from '../services/requestInterceptor';

/**
 * These tests drive failures through the REAL interceptor chain rather than
 * constructing an AxiosError by hand. That distinction is the point: the
 * interceptor previously rejected plain object literals and a spread copy of
 * the AxiosError, both of which lose the prototype. Every `instanceof` check in
 * categorizeError then failed and the error degraded to String(error), so the
 * user-facing message became "[object Object]".
 *
 * A test that builds an AxiosError directly passes even with that bug present.
 */

const tokenServiceStub: ITokenService = {
    refreshToken: jest.fn(async () => false),
    setSession: jest.fn(async () => undefined),
    clearSession: jest.fn(async () => undefined),
    getRefreshToken: jest.fn(async () => null),
    logout: jest.fn(async () => undefined),
};

/** Builds an axios instance whose adapter always fails with the given response. */
const makeFailingClient = (status: number, data: unknown): AxiosInstance => {
    const instance = axios.create({ baseURL: 'https://example.test' });

    instance.defaults.adapter = async (config) => {
        const error = new AxiosError(`Request failed with status code ${status}`, String(status), config as never, {}, {
            status,
            statusText: 'Error',
            data,
            headers: {},
            config: config as never,
        } as never);
        throw error;
    };

    new RequestInterceptor(instance, tokenServiceStub).setupInterceptors();
    return instance;
};

describe('HttpClient.request failure contract', () => {
    it('rejects instead of resolving undefined', async () => {
        const failing = makeFailingClient(500, { message: 'Server exploded' });
        const errorHandlerStub = { handleError: new ErrorHandler().handleError.bind(new ErrorHandler()) };

        // Mirror HttpClient.request's catch: the error must propagate, not resolve.
        const call = async () => {
            try {
                return await failing.get('/posts');
            } catch (e) {
                return await errorHandlerStub.handleError(e);
            }
        };

        await expect(call()).rejects.toBeInstanceOf(AppError);
        // The pre-fix behaviour resolved undefined here, which React Query v5 then
        // rejected with "Query data cannot be undefined", masking the real error.
        await expect(call()).rejects.not.toBeUndefined();
    });

    it('surfaces the server message rather than a React Query undefined-data error', async () => {
        const failing = makeFailingClient(500, { message: 'Server exploded' });
        let captured: unknown;

        try {
            await failing.get('/posts');
        } catch (e) {
            captured = e;
        }

        const appError = errorHandler.handle(captured);
        expect(appError.message).toBe('Server exploded');
        expect(appError.message).not.toContain('Query data cannot be undefined');
    });
});

describe('error propagation through the interceptor chain', () => {
    it('rejects with a real Error instance, not a plain object', async () => {
        const client = makeFailingClient(500, { message: 'Server exploded' });

        const rejection = await client.get('/posts').then(
            () => null,
            (e: unknown) => e
        );

        expect(rejection).toBeInstanceOf(Error);
    });

    it('preserves the server message end to end instead of "[object Object]"', async () => {
        const client = makeFailingClient(500, { message: 'Server exploded' });

        const rejection = await client.get('/posts').then(
            () => null,
            (e: unknown) => e
        );

        const appError = errorHandler.handle(rejection);

        expect(appError).toBeInstanceOf(AppError);
        expect(appError.message).toBe('Server exploded');
        expect(appError.message).not.toContain('[object Object]');
        expect(appError.code).not.toBe(ErrorCode.UNKNOWN_ERROR);
    });

    it('keeps the AxiosError prototype so categorizeError can classify it', async () => {
        const client = makeFailingClient(503, { message: 'Service down' });

        const rejection = await client.get('/posts').then(
            () => null,
            (e: unknown) => e
        );

        // The spread-copy bug produced a plain object here, which is what caused
        // the fallback to String(error).
        expect(rejection).toBeInstanceOf(AxiosError);
    });

    // NOTE: a 401 "token expired" case is deliberately absent.
    //
    // Driving one through this chain exhausts the heap. The interceptor's 401
    // branch calls refreshToken() and then replays the original request through
    // the SAME axios instance it is attached to, with no _retry flag and no
    // exclusion for the refresh endpoint — so a persistently failing request
    // recurses without bound. Confirmed empirically: the jest worker OOMs after
    // ~120s with "Ineffective mark-compacts near heap limit".
    //
    // That is the refresh-recursion defect, owned by the token lifecycle phase.
    // Add the 401 coverage there, once the recursion is bounded.
});
