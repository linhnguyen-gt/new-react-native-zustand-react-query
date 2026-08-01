import SecureStorageService from '@/data/services/secureStorage';
import { isTokenExpired, validateToken } from '@/shared/validation';

// Directly from the module, not from `@/shared/helper` — that barrel re-exports this
// file, so going through it would be a cycle.
import Logger from './logger';

// `as const` rather than `enum` — see `apiMethod.ts` for why: an `enum` emits runtime
// code that a type-stripping transpiler cannot erase.
const TypeToken = {
    RefreshToken: 'REFRESH_TOKEN',
} as const;

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
 * How long a stored refresh token is kept when the server does not say.
 *
 * This is a local retention window, NOT a token lifetime the server issued. It exists
 * so a token abandoned on a device does not sit in the keychain indefinitely.
 */
const DEFAULT_REFRESH_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Saves the refresh token to secure storage.
 *
 * @param refreshToken the credential to store
 * @param expiresAt **the refresh token's own expiry**, epoch ms, when the server
 * supplies one. Omit it to fall back to {@link DEFAULT_REFRESH_RETENTION_MS}.
 *
 * ⚠ Never pass the ACCESS token's expiry here. Access tokens live for minutes; doing
 * so makes `getToken()` consider the refresh token expired minutes after login, clear
 * it, and log the user out — with the local retention window taking the blame for a
 * value that came from the wrong field. The two expiries are separate fields in the
 * refresh contract precisely so they cannot be confused.
 *
 * @example
 * await setToken({ refreshToken: 'new-refresh-token' })
 * await setToken({ refreshToken: 'rotated', expiresAt: body.refreshExpiredAt })
 */
export const setToken = async ({
    refreshToken,
    expiresAt,
}: {
    refreshToken?: string | undefined | null;
    expiresAt?: number;
}) => {
    if (!refreshToken) return;

    if (!validateToken(refreshToken)) {
        throw new Error('Invalid token format');
    }

    const tokenData: TokenData = {
        v: TOKEN_FORMAT_VERSION,
        refreshToken,
        createdAt: Date.now(),
        expiresAt: expiresAt ?? Date.now() + DEFAULT_REFRESH_RETENTION_MS,
    };

    try {
        await SecureStorageService.setItem(TypeToken.RefreshToken, JSON.stringify(tokenData));
    } catch {
        throw new Error('Failed to store token securely');
    }
};

/**
 * Retrieves the stored refresh token.
 *
 * Deletes the stored value when it is unusable — wrong format version, expired, or
 * failing validation. It does **not** delete on a keystore failure: those propagate.
 *
 * The distinction matters. `SecureStorageService.getItem` throws when the keystore
 * itself is unavailable, and the token is stored `WHEN_UNLOCKED_THIS_DEVICE_ONLY`, so
 * a read attempted while the device is locked — a background wake, for instance —
 * fails transiently. Treating that as "unreadable, therefore junk" would destroy a
 * perfectly valid credential, defeating the refresh layer's careful rule that only an
 * explicit server rejection costs the user their token.
 *
 * @returns the token, or undefined when there is none to return
 * @throws SecureStorageUnavailableError if the keystore could not be read at all
 * @example
 * const token = await getToken()
 */
export const getToken = async (): Promise<string | undefined> => {
    // Outside the try: a keystore failure must propagate rather than be mistaken for a
    // corrupt payload.
    const tokenString = await SecureStorageService.getItem(TypeToken.RefreshToken);

    try {
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
        // Reached only for a payload we could read but could not interpret — a JSON
        // parse failure. That value is genuinely junk, so clearing it is right.
        await clearToken();
        return undefined;
    }
};

/**
 * Removes the stored refresh token.
 *
 * Swallows failure so a logout is never blocked by the keystore, but logs it: a silent
 * catch here means `logout()` reports success while the credential is still on the
 * device, which is the one outcome a logout must not get wrong quietly.
 *
 * @returns Promise that resolves when clearing is complete
 * @example
 * await clearToken()
 */
export const clearToken = async (): Promise<void> => {
    try {
        await SecureStorageService.removeItem(TypeToken.RefreshToken);
    } catch (error) {
        Logger.error('Storage', 'Failed to remove the stored refresh token; it may still be on the device', error);
    }
};

/**
 * Deliberately retained despite having no production caller today.
 *
 * The four one-line `secure*` wrappers that used to sit below were deleted for
 * exactly the reason this one survives: they delegated straight to
 * `SecureStorageService`, so their tests asserted that a passthrough passes
 * through. These two carry real logic — expiry and format-version handling — and
 * the token lifecycle work needs them, so deleting and re-adding would be churn.
 *
 * Treat them as unproven, not as working code: neither has run against a real
 * `SecureStorageService`, only against a mock.
 */
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
