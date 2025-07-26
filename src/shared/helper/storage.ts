import AsyncStorage from '@react-native-async-storage/async-storage';

enum TypeToken {
    RefreshToken = 'REFRESH_TOKEN',
}

/**
 * Saves access and refresh tokens to AsyncStorage
 * @param param0 Object containing optional accessToken and refreshToken
 * @example
 * await setToken({
 *   refreshToken: 'new-refresh-token'
 * })
 */
export const setToken = async ({ refreshToken }: { refreshToken?: string | undefined | null }) => {
    if (!refreshToken) return;
    await AsyncStorage.setItem(TypeToken.RefreshToken, refreshToken);
};

/**
 * Retrieves a token from AsyncStorage
 * @param type Type of token to retrieve (AccessToken or RefreshToken)
 * @returns Promise resolving to the token string or undefined
 * @example
 * const token = await getToken(TypeToken.AccessToken)
 */
export const getToken = async () => (await AsyncStorage.getItem(TypeToken.RefreshToken)) ?? undefined;

/**
 * Clears all tokens including refresh token
 * @returns Promise that resolves when clearing is complete
 * @example
 * await clearToken()
 */
export const clearToken = async () => {
    await AsyncStorage.removeItem(TypeToken.RefreshToken);
};
