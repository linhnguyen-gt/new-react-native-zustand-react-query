import * as storage from '../storage';

import SecureStorageService from '@/data/services/secureStorage';

jest.mock('@/data/services/secureStorage');

const mockSecureStorageService = SecureStorageService as jest.Mocked<typeof SecureStorageService>;

describe('Storage Helper', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('setToken', () => {
        it('should store valid token successfully', async () => {
            const mockToken = 'valid-refresh-token-123';
            mockSecureStorageService.setItem.mockResolvedValue();

            await expect(storage.setToken({ refreshToken: mockToken })).resolves.not.toThrow();

            expect(mockSecureStorageService.setItem).toHaveBeenCalledWith(
                'REFRESH_TOKEN',
                expect.stringContaining(mockToken)
            );
        });

        it('should not store when refreshToken is null', async () => {
            await expect(storage.setToken({ refreshToken: null })).resolves.not.toThrow();

            expect(mockSecureStorageService.setItem).not.toHaveBeenCalled();
        });

        it('should not store when refreshToken is undefined', async () => {
            await expect(storage.setToken({ refreshToken: undefined })).resolves.not.toThrow();

            expect(mockSecureStorageService.setItem).not.toHaveBeenCalled();
        });

        it('should throw error for invalid token format (too short)', async () => {
            const invalidToken = 'short';

            await expect(storage.setToken({ refreshToken: invalidToken })).rejects.toThrow('Invalid token format');

            expect(mockSecureStorageService.setItem).not.toHaveBeenCalled();
        });

        it('should throw error for invalid token format (too long)', async () => {
            const invalidToken = 'a'.repeat(1001);

            await expect(storage.setToken({ refreshToken: invalidToken })).rejects.toThrow('Invalid token format');

            expect(mockSecureStorageService.setItem).not.toHaveBeenCalled();
        });

        it('should throw error when SecureStorageService fails', async () => {
            const mockToken = 'valid-refresh-token-123';
            mockSecureStorageService.setItem.mockRejectedValue(new Error('Storage failed'));

            await expect(storage.setToken({ refreshToken: mockToken })).rejects.toThrow(
                'Failed to store token securely'
            );
        });
    });

    describe('getToken', () => {
        it('should return token when valid and not expired', async () => {
            const mockToken = 'valid-refresh-token-123';
            const mockTokenData = {
                refreshToken: mockToken,
                createdAt: Date.now(),
                expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 1 day from now
            };

            mockSecureStorageService.getItem.mockResolvedValue(JSON.stringify(mockTokenData));

            const result = await storage.getToken();

            expect(result).toBe(mockToken);
        });

        it('should return undefined when no token stored', async () => {
            mockSecureStorageService.getItem.mockResolvedValue(null);

            const result = await storage.getToken();

            expect(result).toBeUndefined();
        });

        it('should return undefined and clear token when expired', async () => {
            const mockTokenData = {
                refreshToken: 'expired-token',
                createdAt: Date.now() - 24 * 60 * 60 * 1000,
                expiresAt: Date.now() - 60 * 60 * 1000,
            };

            mockSecureStorageService.getItem.mockResolvedValue(JSON.stringify(mockTokenData));
            mockSecureStorageService.removeItem.mockResolvedValue();

            const result = await storage.getToken();

            expect(result).toBeUndefined();
            expect(mockSecureStorageService.removeItem).toHaveBeenCalledWith('REFRESH_TOKEN');
        });

        it('should return undefined and clear token when invalid token format', async () => {
            const mockTokenData = {
                refreshToken: 'short',
                createdAt: Date.now(),
                expiresAt: Date.now() + 24 * 60 * 60 * 1000,
            };

            mockSecureStorageService.getItem.mockResolvedValue(JSON.stringify(mockTokenData));
            mockSecureStorageService.removeItem.mockResolvedValue();

            const result = await storage.getToken();

            expect(result).toBeUndefined();
            expect(mockSecureStorageService.removeItem).toHaveBeenCalledWith('REFRESH_TOKEN');
        });

        it('should return undefined and clear token when SecureStorageService fails', async () => {
            mockSecureStorageService.getItem.mockRejectedValue(new Error('Storage failed'));
            mockSecureStorageService.removeItem.mockResolvedValue();

            const result = await storage.getToken();

            expect(result).toBeUndefined();
            expect(mockSecureStorageService.removeItem).toHaveBeenCalledWith('REFRESH_TOKEN');
        });
    });

    describe('clearToken', () => {
        it('should clear token successfully', async () => {
            mockSecureStorageService.removeItem.mockResolvedValue();

            await expect(storage.clearToken()).resolves.not.toThrow();

            expect(mockSecureStorageService.removeItem).toHaveBeenCalledWith('REFRESH_TOKEN');
        });

        it('should handle SecureStorageService failure gracefully', async () => {
            mockSecureStorageService.removeItem.mockRejectedValue(new Error('Storage failed'));

            await expect(storage.clearToken()).resolves.not.toThrow();

            expect(mockSecureStorageService.removeItem).toHaveBeenCalledWith('REFRESH_TOKEN');
        });
    });

    describe('hasValidToken', () => {
        it('should return true when valid token exists', async () => {
            const mockToken = 'valid-refresh-token-123';
            const mockTokenData = {
                refreshToken: mockToken,
                createdAt: Date.now(),
                expiresAt: Date.now() + 24 * 60 * 60 * 1000,
            };

            mockSecureStorageService.getItem.mockResolvedValue(JSON.stringify(mockTokenData));

            const result = await storage.hasValidToken();

            expect(result).toBe(true);
        });

        it('should return false when no token exists', async () => {
            mockSecureStorageService.getItem.mockResolvedValue(null);

            const result = await storage.hasValidToken();

            expect(result).toBe(false);
        });

        it('should return false when token is expired', async () => {
            const mockTokenData = {
                refreshToken: 'expired-token',
                createdAt: Date.now() - 24 * 60 * 60 * 1000,
                expiresAt: Date.now() - 60 * 60 * 1000,
            };

            mockSecureStorageService.getItem.mockResolvedValue(JSON.stringify(mockTokenData));
            mockSecureStorageService.removeItem.mockResolvedValue();

            const result = await storage.hasValidToken();

            expect(result).toBe(false);
        });
    });

    describe('getTokenMetadata', () => {
        it('should return metadata when token exists', async () => {
            const mockTokenData = {
                refreshToken: 'valid-token',
                createdAt: 1234567890,
                expiresAt: 1234567890 + 24 * 60 * 60 * 1000,
            };

            mockSecureStorageService.getItem.mockResolvedValue(JSON.stringify(mockTokenData));

            const result = await storage.getTokenMetadata();

            expect(result).toEqual({
                createdAt: mockTokenData.createdAt,
                expiresAt: mockTokenData.expiresAt,
            });
        });

        it('should return null when no token exists', async () => {
            mockSecureStorageService.getItem.mockResolvedValue(null);

            const result = await storage.getTokenMetadata();

            expect(result).toBeNull();
        });

        it('should return null when SecureStorageService fails', async () => {
            mockSecureStorageService.getItem.mockRejectedValue(new Error('Storage failed'));

            const result = await storage.getTokenMetadata();

            expect(result).toBeNull();
        });
    });

    describe('secureStore', () => {
        it('should store data successfully', async () => {
            const key = 'test-key';
            const value = 'test-value';

            mockSecureStorageService.setItem.mockResolvedValue();

            await expect(storage.secureStore(key, value)).resolves.not.toThrow();

            expect(mockSecureStorageService.setItem).toHaveBeenCalledWith(key, value);
        });

        it('should throw error when SecureStorageService fails', async () => {
            const key = 'test-key';
            const value = 'test-value';

            mockSecureStorageService.setItem.mockRejectedValue(new Error('Storage failed'));

            await expect(storage.secureStore(key, value)).rejects.toThrow('Failed to store data securely');
        });
    });

    describe('secureRetrieve', () => {
        it('should retrieve data successfully', async () => {
            const key = 'test-key';
            const value = 'test-value';

            mockSecureStorageService.getItem.mockResolvedValue(value);

            const result = await storage.secureRetrieve(key);

            expect(result).toBe(value);
            expect(mockSecureStorageService.getItem).toHaveBeenCalledWith(key);
        });

        it('should return null when SecureStorageService fails', async () => {
            const key = 'test-key';

            mockSecureStorageService.getItem.mockRejectedValue(new Error('Storage failed'));

            const result = await storage.secureRetrieve(key);

            expect(result).toBeNull();
        });
    });

    describe('secureRemove', () => {
        it('should remove data successfully', async () => {
            const key = 'test-key';

            mockSecureStorageService.removeItem.mockResolvedValue();

            await expect(storage.secureRemove(key)).resolves.not.toThrow();

            expect(mockSecureStorageService.removeItem).toHaveBeenCalledWith(key);
        });

        it('should handle SecureStorageService failure gracefully', async () => {
            const key = 'test-key';

            mockSecureStorageService.removeItem.mockRejectedValue(new Error('Storage failed'));

            await expect(storage.secureRemove(key)).resolves.not.toThrow();

            expect(mockSecureStorageService.removeItem).toHaveBeenCalledWith(key);
        });
    });

    describe('isSecureStorageAvailable', () => {
        it('should return boolean from SecureStorageService', async () => {
            mockSecureStorageService.isSecureStoreAvailable.mockResolvedValue(true);

            const result = await storage.isSecureStorageAvailable();

            expect(result).toBe(true);
            expect(mockSecureStorageService.isSecureStoreAvailable).toHaveBeenCalled();
        });
    });
});
