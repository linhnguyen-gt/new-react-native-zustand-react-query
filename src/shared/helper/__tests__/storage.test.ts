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
                v: 2,
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
                v: 2,
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
                v: 2,
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

    describe('payload format version', () => {
        const futureExpiry = () => Date.now() + 60_000;

        it('tags what it writes, so a later build can tell the format apart', async () => {
            mockSecureStorageService.setItem.mockResolvedValue();

            await storage.setToken({ refreshToken: 'valid-refresh-token-123' });

            const [, written] = mockSecureStorageService.setItem.mock.calls[0];
            expect(JSON.parse(written).v).toBe(2);
        });

        it('clears an untagged payload rather than parsing it', async () => {
            // What a pre-versioning build left behind. Without the tag check, the fields
            // would be read as if they were the current shape.
            mockSecureStorageService.getItem.mockResolvedValue(
                JSON.stringify({
                    refreshToken: 'valid-refresh-token-123',
                    expiresAt: futureExpiry(),
                })
            );

            await expect(storage.getToken()).resolves.toBeUndefined();
            expect(mockSecureStorageService.removeItem).toHaveBeenCalledWith('REFRESH_TOKEN');
        });

        it('clears a payload tagged with an unknown version', async () => {
            // The downgrade case: expo-updates makes an OTA rollback a supported
            // operation, so an older build can meet a payload from a newer one.
            mockSecureStorageService.getItem.mockResolvedValue(
                JSON.stringify({
                    v: 99,
                    refreshToken: 'valid-refresh-token-123',
                    expiresAt: futureExpiry(),
                })
            );

            await expect(storage.getToken()).resolves.toBeUndefined();
            expect(mockSecureStorageService.removeItem).toHaveBeenCalledWith('REFRESH_TOKEN');
        });

        it('returns a correctly tagged token', async () => {
            mockSecureStorageService.getItem.mockResolvedValue(
                JSON.stringify({
                    v: 2,
                    refreshToken: 'valid-refresh-token-123',
                    expiresAt: futureExpiry(),
                })
            );

            await expect(storage.getToken()).resolves.toBe('valid-refresh-token-123');
        });

        it('withholds metadata from an untagged payload', async () => {
            mockSecureStorageService.getItem.mockResolvedValue(
                JSON.stringify({ createdAt: 1, expiresAt: futureExpiry() })
            );

            await expect(storage.getTokenMetadata()).resolves.toBeNull();
        });
    });
});
