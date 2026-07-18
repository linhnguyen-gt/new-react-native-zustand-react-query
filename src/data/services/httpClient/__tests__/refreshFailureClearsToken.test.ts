import { clearToken, setToken } from '@/shared/helper/storage';

import { TokenService } from '../services/tokenService';

jest.mock('@/shared/helper/storage', () => ({
    getToken: jest.fn(async () => 'a-stored-refresh-token'),
    setToken: jest.fn(async () => undefined),
    clearToken: jest.fn(async () => undefined),
}));

/**
 * Guards the failure path of refreshToken().
 *
 * clearSession() delegates to setToken({ refreshToken: null }), and setToken
 * early-returns on a falsy token — so clearSession() never removes anything from
 * storage. Only logout() reaches clearToken().
 *
 * Before request() was changed to throw, a failed refresh resolved undefined and
 * fell into the `!response.ok` branch, which called logout(). Routing the failure
 * into a catch that called clearSession() would silently stop clearing revoked
 * refresh tokens. This test fails if that regression is reintroduced.
 */
describe('refreshToken failure path', () => {
    const makeHttpClientStub = (requestImpl: () => Promise<never>) => ({
        request: jest.fn(requestImpl),
        clearSession: jest.fn(),
        setAccessToken: jest.fn(),
        clearRefreshTokenTimeout: jest.fn(),
        setRefreshTokenTimeout: jest.fn(),
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('clears the stored refresh token when the refresh request throws', async () => {
        const httpClient = makeHttpClientStub(async () => {
            throw new Error('Network unreachable');
        });

        const service = new TokenService(httpClient as never);
        const result = await service.refreshToken();

        expect(result).toBe(false);
        // clearToken is the only call that actually removes the stored token.
        expect(clearToken).toHaveBeenCalledTimes(1);
    });

    it('does not rely on setToken(null), which is a no-op by design', async () => {
        const httpClient = makeHttpClientStub(async () => {
            throw new Error('Network unreachable');
        });

        const service = new TokenService(httpClient as never);
        await service.refreshToken();

        // If the failure path ever routes through clearSession() again, setToken
        // would be called with a null token and nothing would be removed.
        expect(setToken).not.toHaveBeenCalledWith({ refreshToken: null });
    });
});
