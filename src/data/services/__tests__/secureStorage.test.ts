import SecureStorageService from '../secureStorage';

describe('SecureStorageService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('setItem', () => {
        it('should throw error when SecureStore is not available', async () => {
            const key = 'test-key';
            const value = 'test-value';

            await expect(SecureStorageService.setItem(key, value)).rejects.toThrow(
                'Secure storage is not available on this device'
            );
        });

        it('should throw error for empty value when SecureStore is not available', async () => {
            const key = 'test-key';
            const value = '';

            await expect(SecureStorageService.setItem(key, value)).rejects.toThrow(
                'Secure storage is not available on this device'
            );
        });
    });

    describe('getItem', () => {
        it('should throw error when SecureStore is not available', async () => {
            const key = 'test-key';

            await expect(SecureStorageService.getItem(key)).rejects.toThrow(
                'Secure storage is not available on this device'
            );
        });

        it('should throw error for non-existent key when SecureStore is not available', async () => {
            const key = 'non-existent-key';

            await expect(SecureStorageService.getItem(key)).rejects.toThrow(
                'Secure storage is not available on this device'
            );
        });
    });

    describe('removeItem', () => {
        it('should throw error when SecureStore is not available', async () => {
            const key = 'test-key';

            await expect(SecureStorageService.removeItem(key)).rejects.toThrow(
                'Secure storage is not available on this device'
            );
        });
    });

    describe('isSecureStoreAvailable', () => {
        it('should return boolean', async () => {
            const result = await SecureStorageService.isSecureStoreAvailable();
            expect(typeof result).toBe('boolean');
        });
    });
});
