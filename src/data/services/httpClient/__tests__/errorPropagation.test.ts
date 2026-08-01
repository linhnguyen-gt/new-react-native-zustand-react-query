import axios, { AxiosError, type AxiosInstance } from 'axios';

import { errorHandler } from '@/core/error';
import { AppError, ErrorCode } from '@/shared/errors';

import { type ITokenService } from '../interfaces/IHttpClient';
import { rethrowAsAppError } from '../services/errorHandler';
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

/**
 * Builds an axios instance whose adapter fails with NO response at all — the shape
 * axios produces when the request never reached a server.
 *
 * @param code axios error code; `ECONNABORTED` is what a timeout looks like.
 */
const makeUnreachableClient = (code?: string): AxiosInstance => {
    const instance = axios.create({ baseURL: 'https://example.test' });

    instance.defaults.adapter = async (config) => {
        // No response argument: that absence is exactly what handleAxiosError keys on.
        throw new AxiosError('Network Error', code, config as never, {});
    };

    new RequestInterceptor(instance, tokenServiceStub).setupInterceptors();
    return instance;
};

describe('offline classification', () => {
    /**
     * A request that never reached a server did not produce a 500.
     *
     * There used to be a second axios mapper (`extractErrorData`) that defaulted a
     * missing status to 500 and returned an HttpError, so the same offline failure
     * classified as NETWORK_ERROR on one path and SERVER_ERROR on the other. That
     * mapper was deleted as unreferenced, leaving one. This pins the surviving
     * behaviour so a future mapper cannot quietly reintroduce the synthetic 500.
     *
     * Scope note: for a no-response error the interceptor is a pass-through —
     * isTokenExpiredError and isUserNotFoundError both read `error.response?.status`,
     * get undefined, and reject the original. So what this covers is the
     * interceptor-to-handler seam and the classification, not the HttpClient
     * contract. The prototype-preservation tests below are the ones that genuinely
     * depend on the chain.
     */
    it('classifies an unreachable server as NETWORK_ERROR, not a synthetic 500', async () => {
        const client = makeUnreachableClient();

        const rejection = await client.get('/posts').then(
            () => null,
            (e: unknown) => e
        );
        const appError = errorHandler.handle(rejection);

        expect(appError.code).toBe(ErrorCode.NETWORK_ERROR);
        // Assert the actual value, not merely "not 500" — that would pass for any
        // wrong status. handleAxiosError uses `error.response?.status || 0`, so a
        // request that never reached a server carries 0.
        expect(appError.context?.statusCode).toBe(0);
    });

    it('classifies an aborted connection as TIMEOUT_ERROR', async () => {
        const client = makeUnreachableClient('ECONNABORTED');

        const rejection = await client.get('/posts').then(
            () => null,
            (e: unknown) => e
        );
        const appError = errorHandler.handle(rejection);

        expect(appError.code).toBe(ErrorCode.TIMEOUT_ERROR);
    });
});

describe('HttpClient.request failure contract', () => {
    it('rejects instead of resolving undefined', async () => {
        const failing = makeFailingClient(500, { message: 'Server exploded' });
        // Mirror HttpClient.request's catch: the error must propagate, not resolve.
        // `rethrowAsAppError` is a plain function now; it used to be a stateless
        // `ErrorHandler` class this test had to instantiate twice to bind a method off.
        const call = async () => {
            try {
                return await failing.get('/posts');
            } catch (e) {
                return await rethrowAsAppError(e);
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
