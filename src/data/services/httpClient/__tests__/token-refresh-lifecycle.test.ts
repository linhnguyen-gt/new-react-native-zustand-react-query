import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';

import { clearToken, getToken, setToken } from '@/shared/helper/storage';

import { TokenService } from '../services/tokenService';

jest.mock('@/shared/helper/storage', () => ({
    getToken: jest.fn(async () => 'a-stored-refresh-token'),
    setToken: jest.fn(async () => undefined),
    clearToken: jest.fn(async () => undefined),
}));

/**
 * Only `createRefreshClient` is mocked. `requestRefresh` runs for real so the contract
 * validation and the outbound request shape are genuinely exercised rather than
 * stubbed away — the point of these tests is what actually goes on the wire.
 */
const mockCreateRefreshClient = jest.fn();
jest.mock('../services/refresh-client', () => ({
    ...jest.requireActual('../services/refresh-client'),
    createRefreshClient: (...args: unknown[]) => mockCreateRefreshClient(...args),
}));

interface CapturedRequest {
    url?: string;
    method?: string;
    body: unknown;
}

/**
 * An axios instance whose adapter never touches the network.
 *
 * @param respond decides the outcome per call, so a single client can serve a burst.
 */
const makeStubClient = (respond: (call: number) => { status: number; data?: unknown }) => {
    const captured: CapturedRequest[] = [];
    let calls = 0;

    const instance = axios.create();
    instance.defaults.adapter = async (config: AxiosRequestConfig) => {
        calls += 1;
        captured.push({
            url: config.url,
            method: config.method,
            body: typeof config.data === 'string' ? JSON.parse(config.data) : config.data,
        });

        const outcome = respond(calls);

        if (outcome.status >= 400) {
            const error = new axios.AxiosError('Request failed', String(outcome.status), config as never, {}, {
                status: outcome.status,
                statusText: 'Error',
                data: outcome.data,
                headers: {},
                config: config as never,
            } as never);
            throw error;
        }

        return {
            status: outcome.status,
            statusText: 'OK',
            data: outcome.data,
            headers: {},
            config: config as never,
        } as never;
    };

    return { instance, captured };
};

const makeHttpClientStub = () => ({
    request: jest.fn(),
    clearSession: jest.fn(),
    setAccessToken: jest.fn(),
    clearRefreshTokenTimeout: jest.fn(),
    setRefreshTokenTimeout: jest.fn(),
    getBaseURL: jest.fn(() => 'https://example.test'),
});

const okBody = (over: Record<string, unknown> = {}) => ({
    data: {
        accessToken: 'new-access-token',
        refreshToken: 'rotated-refresh-token',
        expiredAt: Date.now() + 600_000,
        ...over,
    },
});

let stub: ReturnType<typeof makeStubClient>;
const useClient = (client: AxiosInstance) => mockCreateRefreshClient.mockReturnValue(client);

beforeEach(() => {
    // Fake timers, or a successful refresh leaves a real ~570s setTimeout pending —
    // scheduleRefresh arms the next refresh from `expiredAt` — and jest hangs waiting
    // for the event loop to drain. Microtasks are unaffected, so the promise
    // assertions below still resolve normally.
    jest.useFakeTimers();
    jest.clearAllMocks();

    // Re-establish the storage defaults explicitly. `clearAllMocks` resets recorded
    // calls but NOT queued implementations, so a test that swaps one in would otherwise
    // leak it into whichever test runs next — which is exactly what happened: a
    // never-resolving setToken silently hung an unrelated test further down.
    (getToken as jest.Mock).mockResolvedValue('a-stored-refresh-token');
    (setToken as jest.Mock).mockResolvedValue(undefined);
    (clearToken as jest.Mock).mockResolvedValue(undefined);
});

afterEach(() => {
    jest.useRealTimers();
});

describe('the refresh request itself', () => {
    it('carries the stored refresh token in the body', async () => {
        stub = makeStubClient(() => ({ status: 200, data: okBody() }));
        useClient(stub.instance);

        const service = new TokenService(makeHttpClientStub() as never);
        await service.refreshToken();

        // Captured off the wire, not read off the source. Before this phase the refresh
        // read the token and then never attached it — the only credential on that wire
        // was the shared instance's stale Authorization default, which an
        // interceptor-free client does not have. Every refresh would have been a
        // guaranteed 401.
        expect(stub.captured).toHaveLength(1);
        expect(stub.captured[0]?.body).toEqual({ refreshToken: 'a-stored-refresh-token' });
    });

    it('uses POST, not GET', async () => {
        stub = makeStubClient(() => ({ status: 200, data: okBody() }));
        useClient(stub.instance);

        await new TokenService(makeHttpClientStub() as never).refreshToken();

        // A credential on a GET lands in access logs, proxy logs, and anything else
        // that records URLs.
        expect(stub.captured[0]?.method).toBe('post');
        expect(stub.captured[0]?.url).toContain('refresh-token');
    });
});

describe('what a failed refresh costs the user', () => {
    it('keeps the stored token when the network is unreachable', async () => {
        stub = makeStubClient(() => {
            throw new Error('Network unreachable');
        });
        useClient(stub.instance);

        const service = new TokenService(makeHttpClientStub() as never);
        const result = await service.refreshToken();

        expect(result).toBe(false);
        // The scheduled refresh timer can fire in a tunnel or in airplane mode. Clearing
        // here would permanently delete a perfectly valid credential for a reason that
        // had nothing to do with the user or the token.
        expect(clearToken).not.toHaveBeenCalled();
    });

    it('clears the stored token when the server rejects the credential', async () => {
        stub = makeStubClient(() => ({ status: 401, data: { message: 'invalid refresh token' } }));
        useClient(stub.instance);

        const service = new TokenService(makeHttpClientStub() as never);
        const result = await service.refreshToken();

        expect(result).toBe(false);
        // clearToken is the only call that actually removes the stored token —
        // setToken({ refreshToken: null }) early-returns on the falsy value and removes
        // nothing, which is how a revoked credential used to survive on the device.
        expect(clearToken).toHaveBeenCalledTimes(1);
        expect(setToken).not.toHaveBeenCalledWith(expect.objectContaining({ refreshToken: null }));
    });

    it('clears the stored token on 403 as well as 401', async () => {
        stub = makeStubClient(() => ({ status: 403, data: {} }));
        useClient(stub.instance);

        await new TokenService(makeHttpClientStub() as never).refreshToken();

        expect(clearToken).toHaveBeenCalledTimes(1);
    });

    it('gives up and ends the session after repeated transient failures', async () => {
        stub = makeStubClient(() => {
            throw new Error('Network unreachable');
        });
        useClient(stub.instance);

        const service = new TokenService(makeHttpClientStub() as never);

        // Without a ceiling, a permanently unreachable host retries for the life of the
        // process and the user sits in a session that never works and never ends.
        for (let i = 0; i < 5; i += 1) {
            await service.refreshToken();
        }

        expect(clearToken).toHaveBeenCalledTimes(1);
    });
});

describe('a 200 that does not honour the contract', () => {
    it('is treated as failure, not success', async () => {
        stub = makeStubClient(() => ({ status: 200, data: { data: { expiredAt: Date.now() + 600_000 } } }));
        useClient(stub.instance);

        const httpClient = makeHttpClientStub();
        const result = await new TokenService(httpClient as never).refreshToken();

        // Reporting success here left the user with no Authorization header, a refresh
        // token still on disk, no logout and no scheduled retry: silently unauthenticated
        // forever, with every later request going out bare.
        expect(result).toBe(false);
        expect(httpClient.setAccessToken).not.toHaveBeenCalledWith(undefined);
    });

    it('keeps the stored token, since a malformed body is the server misbehaving', async () => {
        stub = makeStubClient(() => ({ status: 200, data: { data: {} } }));
        useClient(stub.instance);

        await new TokenService(makeHttpClientStub() as never).refreshToken();

        expect(clearToken).not.toHaveBeenCalled();
    });
});

describe('concurrency', () => {
    it('collapses a burst of refreshes onto a single request', async () => {
        stub = makeStubClient(() => ({ status: 200, data: okBody() }));
        useClient(stub.instance);

        const service = new TokenService(makeHttpClientStub() as never);
        const results = await Promise.all([
            service.refreshToken(),
            service.refreshToken(),
            service.refreshToken(),
            service.refreshToken(),
            service.refreshToken(),
        ]);

        // Five concurrent 401s previously fired five refreshes racing to write the
        // session. With rotation that is worse than wasteful: four of the five responses
        // carry a refresh token the server has already invalidated.
        expect(stub.captured).toHaveLength(1);
        expect(results).toEqual([true, true, true, true, true]);
    });
});

describe('the failure taxonomy, driven by real axios errors', () => {
    /** A transport failure as axios actually reports it: an AxiosError with no response. */
    const networkError = (code: string) => {
        const error = new axios.AxiosError('Network Error', code, {} as never, {});
        return error;
    };

    it.each([
        ['ERR_NETWORK', 'a dropped connection'],
        ['ECONNABORTED', 'a timeout'],
        ['ERR_CANCELED', 'the deadline aborting the request'],
    ])('keeps the token for %s (%s)', async (code) => {
        stub = makeStubClient(() => {
            throw networkError(code);
        });
        useClient(stub.instance);

        await new TokenService(makeHttpClientStub() as never).refreshToken();

        // Asserted with a real AxiosError, not a plain Error: a plain Error fails the
        // isAxiosError gate, so a mutation making isCredentialRejected true for ANY
        // axios error would slip past a test that threw one.
        expect(clearToken).not.toHaveBeenCalled();
    });

    it('keeps the token for a 500', async () => {
        stub = makeStubClient(() => ({ status: 500, data: { message: 'boom' } }));
        useClient(stub.instance);

        await new TokenService(makeHttpClientStub() as never).refreshToken();

        // A server fault says nothing about whether the credential is valid.
        expect(clearToken).not.toHaveBeenCalled();
    });

    it('ends the session when there is no stored credential to refresh with', async () => {
        (getToken as jest.Mock).mockResolvedValueOnce(undefined);
        stub = makeStubClient(() => ({ status: 200, data: okBody() }));
        useClient(stub.instance);

        const result = await new TokenService(makeHttpClientStub() as never).refreshToken();

        // Terminal, not transient: there is nothing to retry with, so leaving the user
        // "logged in" until an unrelated failure ceiling trips would strand them.
        expect(result).toBe(false);
        expect(stub.captured).toHaveLength(0);
        expect(clearToken).toHaveBeenCalledTimes(1);
    });
});

describe('a burst that fails together', () => {
    it('counts one failure, not one per waiter', async () => {
        stub = makeStubClient(() => {
            throw new axios.AxiosError('Network Error', 'ERR_NETWORK', {} as never, {});
        });
        useClient(stub.instance);

        const service = new TokenService(makeHttpClientStub() as never);
        await Promise.all([
            service.refreshToken(),
            service.refreshToken(),
            service.refreshToken(),
            service.refreshToken(),
            service.refreshToken(),
        ]);

        // Five queued requests sharing one failed attempt is ONE failure. Counting per
        // caller took the ceiling from 0 to 5 on a single offline blip and logged the
        // user out — the exact credential loss the 401/403-only rule exists to prevent.
        expect(stub.captured).toHaveLength(1);
        expect(clearToken).not.toHaveBeenCalled();
    });
});

describe('an old refresh settling into a new session', () => {
    it('does not discard the newer in-flight request', async () => {
        const gates: (() => void)[] = [];
        let calls = 0;

        const instance = axios.create();
        instance.defaults.adapter = async (config: AxiosRequestConfig) => {
            calls += 1;
            await new Promise<void>((resolve) => gates.push(resolve));
            return {
                status: 200,
                statusText: 'OK',
                data: okBody(),
                headers: {},
                config: config as never,
            } as never;
        };
        useClient(instance);

        const service = new TokenService(makeHttpClientStub() as never);

        const first = service.refreshToken();
        await Promise.resolve();

        // Ends the session and nulls the in-flight slot.
        await service.logout();

        const second = service.refreshToken();
        await Promise.resolve();

        // The OLD request now settles. Its cleanup must not touch the slot the newer
        // request owns — an unconditional `inFlight = null` is an ABA bug that hands the
        // next caller a fresh dispatch instead of the in-flight one. With rotation both
        // would rotate and the loser's stored token would be dead on arrival.
        gates[0]?.();
        await first;

        const third = service.refreshToken();
        await Promise.resolve();

        gates.forEach((release) => release());
        await Promise.all([second, third]);

        // Two dispatches: the pre-logout one and the post-logout one. A third would mean
        // `third` failed to join `second`.
        expect(calls).toBe(2);
    });
});

describe('a refresh that outlives its session', () => {
    it('does not re-install credentials after logout', async () => {
        let release: (() => void) | undefined;
        const gate = new Promise<void>((resolve) => {
            release = resolve;
        });

        stub = makeStubClient(() => ({ status: 200, data: okBody() }));
        const slowInstance = stub.instance;
        const inner = slowInstance.defaults.adapter as (c: AxiosRequestConfig) => Promise<never>;
        slowInstance.defaults.adapter = async (config: AxiosRequestConfig) => {
            await gate;
            return inner(config);
        };
        useClient(slowInstance);

        const httpClient = makeHttpClientStub();
        const service = new TokenService(httpClient as never);

        const pending = service.refreshToken();
        await service.logout();
        release?.();
        const result = await pending;

        // TokenService lives for the whole process, so it outlives logout and account
        // switch. Writing here would re-arm the previous user's Authorization header —
        // on a logged-out client, or on whoever logged in next.
        expect(result).toBe(false);
        expect(setToken).not.toHaveBeenCalled();
        expect(httpClient.setAccessToken).not.toHaveBeenCalledWith('new-access-token');
    });

    it('does not resurrect the credential when logout lands mid-write', async () => {
        stub = makeStubClient(() => ({ status: 200, data: okBody() }));
        useClient(stub.instance);

        const httpClient = makeHttpClientStub();
        const service = new TokenService(httpClient as never);

        // Logout lands *inside* the keystore write, deterministically — that is where the
        // real gap was. The epoch was checked before setSession, but setAccessToken runs
        // synchronously and setToken then awaits. A logout in that gap completed its
        // teardown only for this write to finish afterwards: header restored, token
        // written back into the just-cleared keystore, timer armed. The device would be
        // logged out yet holding a live credential that silently re-authenticates.
        (setToken as jest.Mock).mockImplementation(async () => {
            await service.logout();
        });

        const result = await service.refreshToken();

        expect(result).toBe(false);
        // The teardown must be the last word: clearToken is called again to undo
        // whatever the in-flight write had already put back.
        expect(clearToken).toHaveBeenCalled();
        expect(httpClient.setRefreshTokenTimeout).not.toHaveBeenCalled();
    });
});

describe('the scheduled refresh', () => {
    it('arms a timer for the access-token expiry, less a buffer', async () => {
        const accessExpiry = Date.now() + 600_000;
        stub = makeStubClient(() => ({ status: 200, data: okBody({ expiredAt: accessExpiry }) }));
        useClient(stub.instance);

        const httpClient = makeHttpClientStub();
        await new TokenService(httpClient as never).refreshToken();

        // Fake timers meant nothing exercised this path at all, so the delay itself was
        // never asserted.
        expect(httpClient.clearRefreshTokenTimeout).toHaveBeenCalled();
        expect(httpClient.setRefreshTokenTimeout).toHaveBeenCalledTimes(1);
        expect(jest.getTimerCount()).toBeGreaterThan(0);
    });

    it('does not arm one for an already-expired access token', async () => {
        stub = makeStubClient(() => ({ status: 200, data: okBody({ expiredAt: Date.now() - 1_000 }) }));
        useClient(stub.instance);

        const httpClient = makeHttpClientStub();
        await new TokenService(httpClient as never).refreshToken();

        expect(httpClient.setRefreshTokenTimeout).not.toHaveBeenCalled();
    });
});

describe('expiry handling', () => {
    it('stores the refresh token lifetime, never the access token lifetime', async () => {
        const accessExpiry = Date.now() + 600_000; // minutes
        const refreshExpiry = Date.now() + 30 * 24 * 60 * 60 * 1000; // a month

        stub = makeStubClient(() => ({
            status: 200,
            data: okBody({ expiredAt: accessExpiry, refreshExpiredAt: refreshExpiry }),
        }));
        useClient(stub.instance);

        await new TokenService(makeHttpClientStub() as never).refreshToken();

        // Passing the access-token expiry here would make getToken() consider the
        // refresh token expired minutes after login and clear it, logging the user out
        // with the local retention window taking the blame.
        expect(setToken).toHaveBeenCalledWith({
            refreshToken: 'rotated-refresh-token',
            expiresAt: refreshExpiry,
        });
    });

    it('leaves the stored credential in place when the backend does not rotate', async () => {
        stub = makeStubClient(() => ({ status: 200, data: okBody({ refreshToken: undefined }) }));
        useClient(stub.instance);

        await new TokenService(makeHttpClientStub() as never).refreshToken();

        expect(setToken).toHaveBeenCalledWith({ refreshToken: undefined, expiresAt: undefined });
    });
});
