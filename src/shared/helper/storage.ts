import SecureStorageService from '@/data/services/secureStorage';

enum TypeToken {
    RefreshToken = 'REFRESH_TOKEN',
}

interface TokenData {
    refreshToken?: string | null;
    expiresAt?: number;
    createdAt?: number;
}

const validateToken = (token: string): boolean => {
    return Boolean(token && token.length > 10 && token.length < 1000);
};

const isTokenExpired = (expiresAt?: number): boolean => {
    if (!expiresAt) return false;
    return Date.now() > expiresAt;
};

/**
 * Saves access and refresh tokens to secure storage with encryption
 * @param param0 Object containing optional accessToken and refreshToken
 * @example
 * await setToken({
 *   refreshToken: 'new-refresh-token'
 * })
 */
export const setToken = async ({ refreshToken }: { refreshToken?: string | undefined | null }) => {
    if (!refreshToken) return;

    if (!validateToken(refreshToken)) {
        throw new Error('Invalid token format');
    }

    const tokenData: TokenData = {
        refreshToken,
        createdAt: Date.now(),
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    };

    try {
        await SecureStorageService.setItem(TypeToken.RefreshToken, JSON.stringify(tokenData));
    } catch {
        throw new Error('Failed to store token securely');
    }
};

/**
 * Retrieves a token from secure storage with validation
 * @returns Promise resolving to the token string or undefined
 * @example
 * const token = await getToken()
 */
export const getToken = async (): Promise<string | undefined> => {
    try {
        const tokenString = await SecureStorageService.getItem(TypeToken.RefreshToken);
        if (!tokenString) return undefined;

        const tokenData: TokenData = JSON.parse(tokenString);

        if (isTokenExpired(tokenData.expiresAt)) {
            await clearToken();
            return undefined;
        }

        if (!tokenData.refreshToken || !validateToken(tokenData.refreshToken)) {
            await clearToken();
            return undefined;
        }

        return tokenData.refreshToken;
    } catch {
        await clearToken();
        return undefined;
    }
};

/**
 * Clears all tokens including refresh token
 * @returns Promise that resolves when clearing is complete
 * @example
 * await clearToken()
 */
export const clearToken = async (): Promise<void> => {
    try {
        await SecureStorageService.removeItem(TypeToken.RefreshToken);
    } catch {
        /* empty */
    }
};

export const hasValidToken = async (): Promise<boolean> => {
    const token = await getToken();
    return !!token;
};

export const getTokenMetadata = async (): Promise<{ createdAt?: number; expiresAt?: number } | null> => {
    try {
        const tokenString = await SecureStorageService.getItem(TypeToken.RefreshToken);
        if (!tokenString) return null;

        const tokenData: TokenData = JSON.parse(tokenString);
        return {
            createdAt: tokenData.createdAt,
            expiresAt: tokenData.expiresAt,
        };
    } catch {
        return null;
    }
};

export const secureStore = async (key: string, value: string): Promise<void> => {
    try {
        await SecureStorageService.setItem(key, value);
    } catch {
        throw new Error('Failed to store data securely');
    }
};

export const secureRetrieve = async (key: string): Promise<string | null> => {
    try {
        return await SecureStorageService.getItem(key);
    } catch {
        return null;
    }
};

export const secureRemove = async (key: string): Promise<void> => {
    try {
        await SecureStorageService.removeItem(key);
    } catch {
        /* empty */
    }
};

export const isSecureStorageAvailable = async (): Promise<boolean> => {
    return await SecureStorageService.isSecureStoreAvailable();
};
