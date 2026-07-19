import SecureStorageService from '@/data/services/secureStorage';
import { isTokenExpired, validateToken } from '@/shared/validation';

enum TypeToken {
    RefreshToken = 'REFRESH_TOKEN',
}

/**
 * Current stored-payload format.
 *
 * Bump whenever the shape changes. Without a tag, an older build reading a newer
 * payload (or the reverse) cannot tell "different format" from "corrupt", and
 * `expo-updates` makes downgrade a supported operation — an OTA rollback would
 * otherwise silently sign out everyone holding the newer format with nothing in the
 * logs to explain it.
 *
 * Version 1 is the pre-tag format written by builds that stored AES ciphertext. No
 * install ever held a readable one (the cipher threw on every write), so treating it
 * as unreadable strands nothing.
 */
const TOKEN_FORMAT_VERSION = 2;

interface TokenData {
    /** Format tag. Absent means a pre-versioning payload. */
    v?: number;
    refreshToken?: string | null;
    expiresAt?: number;
    createdAt?: number;
}

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
        v: TOKEN_FORMAT_VERSION,
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

        // An untagged or unknown-version payload is not ours to interpret. Clear it
        // rather than guessing at its shape.
        if (tokenData.v !== TOKEN_FORMAT_VERSION) {
            await clearToken();
            return undefined;
        }

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
        if (tokenData.v !== TOKEN_FORMAT_VERSION) return null;

        return {
            createdAt: tokenData.createdAt,
            expiresAt: tokenData.expiresAt,
        };
    } catch {
        return null;
    }
};
