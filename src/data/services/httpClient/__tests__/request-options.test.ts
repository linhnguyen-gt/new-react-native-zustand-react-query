import axios, { AxiosRequestConfig } from 'axios';

import { networkConfig } from '@/shared/config/appConfig';
import { ErrorSeverity, RequestCancelledError } from '@/shared/errors';

import ApiMethod from '../apiMethod';
import { HttpClient } from '../httpClient';

/**
 * Options declared on `HttpRequestConfig` and forwarded nowhere.
 *
 * `timeout` and `signal` were both part of the public request type, so a caller could
 * set either and watch it do nothing — the axios call was built without them. The
 * signal is the more consequential of the two: React Query hands its query function an
 * AbortSignal and expects it forwarded, so cancelling a query (navigating away
 * mid-request) left the request running to completion with its response discarded.
 */
describe('per-request options', () => {
    /** Captures what the axios instance was actually asked to do. */
    const withCapturedRequest = () => {
        const captured: AxiosRequestConfig[] = [];
        const client = HttpClient.getInstance();

        // Reach past the interceptors: this asserts what the client hands axios, not
        // what the network does.
        const instance = (client as unknown as { INSTANCE: ReturnType<typeof axios.create> }).INSTANCE;

        instance.defaults.adapter = async (config: AxiosRequestConfig) => {
            captured.push(config);
            return {
                status: 200,
                statusText: 'OK',
                data: {},
                headers: {},
                config: config as never,
            } as never;
        };

        return { client, captured };
    };

    it('forwards a per-request timeout', async () => {
        const { client, captured } = withCapturedRequest();

        await client.request({ endpoint: 'posts', method: ApiMethod.GET, timeout: 1234 });

        expect(captured[0].timeout).toBe(1234);
    });

    it('falls back to the client default when no timeout is given', async () => {
        const { client, captured } = withCapturedRequest();

        await client.request({ endpoint: 'posts', method: ApiMethod.GET });

        // axios merges the instance default over an undefined per-request value, so the
        // request carries the configured default rather than "no timeout at all" — which
        // would mean waiting forever.
        expect(captured[0].timeout).toBe(networkConfig.timeoutMs);
        expect(captured[0].signal).toBeUndefined();
    });

    it('forwards an AbortSignal', async () => {
        const { client, captured } = withCapturedRequest();
        const controller = new AbortController();

        await client.request({ endpoint: 'posts', method: ApiMethod.GET, signal: controller.signal });

        expect(captured[0].signal).toBe(controller.signal);
    });

    it('does not accumulate a rate-limiter key per distinct endpoint forever', async () => {
        const { client, captured } = withCapturedRequest();
        const rateLimiter = (client as unknown as { rateLimiter: { trackedEndpointCount: number } }).rateLimiter;

        // Endpoints are templated, so the map is keyed by resolved URL: browsing a list
        // touches `posts/1`, `posts/2`, … and each key holds a timestamp array that
        // empties once its window passes but was never removed. A long session leaked one
        // entry per distinct resource ever touched.
        for (let id = 0; id < 200; id += 1) {
            await client.request({ endpoint: `posts/${id}`, method: ApiMethod.GET });
        }

        expect(captured).toHaveLength(200);

        // Within one window every key is legitimately live, so the bound to assert is
        // that pruning is wired and reclaims — not a specific small number.
        const during = rateLimiter.trackedEndpointCount;
        expect(during).toBeGreaterThan(0);

        jest.spyOn(Date, 'now').mockReturnValue(Date.now() + networkConfig.rateLimitWindowMs * 2);
        await client.request({ endpoint: 'posts/fresh', method: ApiMethod.GET });
        jest.spyOn(Date, 'now').mockRestore();

        // Exactly one: every one of the 200 is drained after the jump, leaving only the
        // request that just went out. `toBeLessThan(during)` would also pass for a prune
        // that reclaimed a single key out of 200.
        expect(rateLimiter.trackedEndpointCount).toBe(1);
    });

    it('classifies an aborted request as a cancellation, not a network failure', async () => {
        const client = HttpClient.getInstance();
        const instance = (client as unknown as { INSTANCE: ReturnType<typeof axios.create> }).INSTANCE;
        const controller = new AbortController();

        instance.defaults.adapter = async (config: AxiosRequestConfig) => {
            controller.abort();
            throw new axios.CanceledError('canceled', undefined, config as never);
        };

        const rejection = await client
            .request({ endpoint: 'posts', method: ApiMethod.GET, signal: controller.signal })
            .then(
                () => null,
                (e: unknown) => e
            );

        // Forwarding the signal made this path reachable for the first time — before it,
        // nothing ever aborted. axios raises CanceledError, an AxiosError with no
        // `.response` and code ERR_CANCELED, which the generic network branch would have
        // claimed: HIGH severity, shouldRetry, shouldShowAlert. Navigating away from a
        // list mid-request would then raise a retryable network alert on the most
        // ordinary interaction in the app.
        expect(rejection).toBeInstanceOf(RequestCancelledError);
        expect((rejection as RequestCancelledError).severity).toBe(ErrorSeverity.LOW);
        expect((rejection as RequestCancelledError).recoveryStrategy.shouldRetry).toBe(false);
        expect((rejection as RequestCancelledError).recoveryStrategy.shouldShowAlert).toBe(false);
    });

    it('does not send response-only security headers on outbound requests', async () => {
        const { client, captured } = withCapturedRequest();

        await client.request({ endpoint: 'posts', method: ApiMethod.GET });

        // X-Content-Type-Options, X-Frame-Options and X-XSS-Protection are instructions a
        // server gives a browser. Sent from a native client they instruct nobody and only
        // add bytes to every request, while reading like a security measure.
        const headerNames = Object.keys(captured[0].headers ?? {}).map((name) => name.toLowerCase());
        expect(headerNames).not.toContain('x-frame-options');
        expect(headerNames).not.toContain('x-content-type-options');
        expect(headerNames).not.toContain('x-xss-protection');
    });
});
