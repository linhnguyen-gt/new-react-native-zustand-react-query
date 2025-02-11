export interface ITokenService {
    getToken(): Promise<string | undefined>;
    refreshToken(): Promise<void>;
}

export class TokenService implements ITokenService {
    async getToken(): Promise<string | undefined> {
        // TODO: get token from local storage
        return "your token";
    }

    async refreshToken(): Promise<void> {
        // TODO: refresh token
    }
}
