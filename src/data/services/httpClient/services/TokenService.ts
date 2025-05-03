import ApiMethod from "../ApiMethod";
import { HttpClient } from "../HttpClient";
import { ITokenService, Session } from "../interfaces/IHttpClient";

import { clearToken, getToken, setToken } from "@/shared/helper";

export class TokenService implements ITokenService {
    private readonly httpClient: HttpClient;

    constructor(httpClient: HttpClient) {
        this.httpClient = httpClient;
    }

    async setSession(session: Session): Promise<void> {
        this.httpClient.setAccessToken(session.accessToken);
        await setToken({
            refreshToken: session.refreshToken || undefined
        });

        // TODO: Implement token lifetime expiration here!!!
        // example:
        const tokenLifetime = 15 * 60 * 1000;
        const refreshBuffer = 30 * 1000;
        const refreshTime = tokenLifetime - refreshBuffer;

        this.httpClient.clearRefreshTokenTimeout();

        const timeoutId = setTimeout(() => {
            this.refreshToken();
        }, refreshTime);

        this.httpClient.setRefreshTokenTimeout(timeoutId);
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
                endpoint: "refresh-token",
                method: ApiMethod.GET
            });

            if (!response?.ok) {
                await this.logout();
                return false;
            }

            const data = response.data?.data;

            await this.setSession({
                accessToken: data?.accessToken,
                expiredAt: data?.expiredAt
            });
            return true;
        } catch (e) {
            console.error("Error refreshing token:", e);
            await this.clearSession();
            return false;
        }
    }

    async logout(): Promise<void> {
        await clearToken();
        this.httpClient.clearSession();
    }
}
