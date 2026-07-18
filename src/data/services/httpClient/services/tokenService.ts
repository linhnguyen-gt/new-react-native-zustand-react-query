import ApiMethod from '../apiMethod';
import { HttpClient } from '../httpClient';
import { ITokenService, Session } from '../interfaces/IHttpClient';

import { clearToken, getToken, Logger, setToken } from '@/shared/helper';

export class TokenService implements ITokenService {
    private readonly httpClient: HttpClient;

    constructor(httpClient: HttpClient) {
        this.httpClient = httpClient;
    }

    async setSession(session: Session): Promise<void> {
        this.httpClient.setAccessToken(session.accessToken);
        await setToken({
            refreshToken: session.refreshToken || undefined,
        });

        // Use server-provided expiration time for token refresh scheduling
        if (session.expiredAt) {
            const refreshBuffer = 30 * 1000; // 30 seconds before expiration
            const refreshTime = session.expiredAt - Date.now() - refreshBuffer;

            this.httpClient.clearRefreshTokenTimeout();

            // Only schedule refresh if token hasn't already expired
            if (refreshTime > 0) {
                const timeoutId = setTimeout(() => {
                    this.refreshToken();
                }, refreshTime);

                this.httpClient.setRefreshTokenTimeout(Number(timeoutId));
            }
        }
    }

    async clearSession(): Promise<void> {
        await setToken({ refreshToken: null });
        this.httpClient.clearSession();
    }

    async getRefreshToken(): Promise<string | null> {
        const token = await getToken();
        return token ?? null;
    }

    async refreshToken(): Promise<boolean> {
        try {
            const refreshToken = await this.getRefreshToken();
            if (!refreshToken) return false;

            const response = await this.httpClient.request<{
                data: {
                    accessToken: string;
                    expiredAt: number;
                };
            }>({
                endpoint: 'refresh-token',
                method: ApiMethod.GET,
            });

            if (!response.ok) {
                await this.logout();
                return false;
            }

            const data = response.data?.data;

            await this.setSession({
                accessToken: data?.accessToken,
                expiredAt: data?.expiredAt,
            });
            return true;
        } catch (e) {
            Logger.error('TokenService', 'Error refreshing token', e);
            // logout(), not clearSession(): clearSession delegates to
            // setToken({ refreshToken: null }), which is a no-op because setToken
            // early-returns on a falsy token. Only logout() reaches clearToken().
            //
            // A failed request used to resolve undefined and fall into the !ok branch
            // below, so every failure cleared the token. Now that request() throws,
            // that path arrives here instead, and this preserves the behaviour
            // exactly. It clears on transient network failures too, which is wrong —
            // narrowing it to server-rejected credentials (401/403) belongs with the
            // rest of the refresh work, not here.
            await this.logout();
            return false;
        }
    }

    async logout(): Promise<void> {
        await clearToken();
        this.httpClient.clearSession();
    }
}
