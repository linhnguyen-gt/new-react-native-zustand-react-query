import axios, { AxiosError, type AxiosRequestConfig } from 'axios';

import { TokenExpiredError } from '@/shared/errors';

import { type ITokenService } from '../interfaces/IHttpClient';
import { RequestInterceptor } from '../services/requestInterceptor';

/**
 * Guards the 401 replay path against the recursion that used to live here.
 *
 * The interceptor replayed the original request through the SAME axios instance it is
 * attached to, with no marker on the retried config and no exclusion for the refresh
 * endpoint. A request that kept returning 401 therefore re-entered this handler on
 * every replay, without bound.
 *
 * That is not a theoretical concern: an early draft of the error-propagation suite
 * included a 401 case and the jest worker died after ~120s with "Ineffective
 * mark-compacts near heap limit". These tests exist so it cannot come back — if the
 * marker is removed, they hang and then fail rather than passing quietly.
 */

const EXPIRED_401 = { message: 'token expired' };

const makeTokenServiceStub = (refreshResult: boolean): ITokenService => ({
    refreshToken: jest.fn(async () => refreshResult),
    setSession: jest.fn(async () => undefined),
    clearSession: jest.fn(async () => undefined),
    getRefreshToken: jest.fn(async () => 'stored-token'),
    logout: jest.fn(async () => undefined),
});

/** An instance whose adapter always 401s, counting how many times it was hit. */
const makeAlways401Client = (tokenService: ITokenService) => {
    const instance = axios.create({ baseURL: 'https://example.test' });
    let calls = 0;

    instance.defaults.adapter = async (config: AxiosRequestConfig) => {
        calls += 1;

        // A runaway replay would spin here rather than failing an assertion, so cap it
        // and surface the count instead of letting the worker exhaust its heap.
        if (calls > 20) {
            throw new Error(`Runaway retry: the interceptor replayed ${calls} times`);
        }

        throw new axios.AxiosError('Request failed with status code 401', '401', config as never, {}, {
            status: 401,
            statusText: 'Unauthorized',
            data: EXPIRED_401,
            headers: {},
            config: config as never,
        } as never);
    };

    new RequestInterceptor(instance, tokenService).setupInterceptors();

    return { instance, calls: () => calls };
};

describe('401 replay', () => {
    it('terminates after a single retry when the credential is still rejected', async () => {
        // Refresh reports success, so the request IS replayed — and the replay 401s too.
        const client = makeAlways401Client(makeTokenServiceStub(true));

        const rejection = await client.instance.get('/posts').then(
            () => null,
            (e: unknown) => e
        );

        // Exactly two: the original and one replay. Unbounded recursion is the failure
        // this asserts against.
        expect(client.calls()).toBe(2);
        expect(rejection).toBeInstanceOf(AxiosError);
    });

    it('does not replay at all when the refresh failed', async () => {
        const tokenService = makeTokenServiceStub(false);
        const client = makeAlways401Client(tokenService);

        const rejection = await client.instance.get('/posts').then(
            () => null,
            (e: unknown) => e
        );

        // The retry used to fire regardless of the refresh result, so after a failed
        // refresh had already logged the user out it reissued the request with no
        // credential — a guaranteed second 401, surfaced to the caller as a transport
        // error rather than an expired session.
        expect(tokenService.refreshToken).toHaveBeenCalledTimes(1);
        expect(client.calls()).toBe(1);
        expect(rejection).toBeInstanceOf(TokenExpiredError);
    });

    it('still refreshes for an endpoint whose name merely contains the refresh path', async () => {
        const tokenService = makeTokenServiceStub(false);
        const client = makeAlways401Client(tokenService);

        await client.instance.get('/admin/refresh-token-audit').then(
            () => null,
            (e: unknown) => e
        );

        // A substring test would swallow this URL — and `/refresh-token-stats`, and
        // anything else sharing the prefix — quietly denying those endpoints
        // refresh-and-replay. The exclusion matches the last path segment instead.
        expect(tokenService.refreshToken).toHaveBeenCalledTimes(1);
    });

    it('never refreshes in response to the refresh endpoint failing', async () => {
        const tokenService = makeTokenServiceStub(true);
        const client = makeAlways401Client(tokenService);

        await client.instance.get('refresh-token').then(
            () => null,
            (e: unknown) => e
        );

        // The refresh goes out on a separate interceptor-free client, so this should be
        // unreachable — it is the second line of defence for the day someone routes it
        // back through the shared instance, which is how the original recursion was built.
        expect(tokenService.refreshToken).not.toHaveBeenCalled();
        expect(client.calls()).toBe(1);
    });
});
