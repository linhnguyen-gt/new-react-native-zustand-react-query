import * as SecureStore from 'expo-secure-store';

import SecureStorageService, {
    SecureStorageService as ServiceClass,
    SecureStorageUnavailableError,
} from '../secureStorage';

/**
 * In-memory stand-in for the platform keystore.
 *
 * The previous suite ran against the unmocked module, where every call rejected, and
 * asserted that rejection five times over. That encoded the broken behaviour as the
 * contract: the AES layer threw on every write (no padding, 63-byte payload), and the
 * catch reported it as "storage is not available". Those assertions passed for exactly
 * the reason the feature did not work.
 */
jest.mock('expo-secure-store', () => {
    const store = new Map<string, string>();

    return {
        __store: store,
        WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
        setItemAsync: jest.fn(async (key: string, value: string) => {
            store.set(key, value);
        }),
        getItemAsync: jest.fn(async (key: string) => store.get(key) ?? null),
        deleteItemAsync: jest.fn(async (key: string) => {
            store.delete(key);
        }),
        isAvailableAsync: jest.fn(async () => true),
    };
});

const mockStore = (SecureStore as unknown as { __store: Map<string, string> }).__store;

/** The real payload shape from storage.ts — 63 bytes, the size the old cipher rejected. */
const TOKEN_PAYLOAD = JSON.stringify({
    v: 2,
    refreshToken: 'a'.repeat(20),
    createdAt: 1_700_000_000_000,
    expiresAt: 1_700_604_800_000,
});

describe('SecureStorageService', () => {
    beforeEach(() => {
        mockStore.clear();
        jest.clearAllMocks();
    });

    it('round-trips a realistic token payload', async () => {
        await SecureStorageService.setItem('REFRESH_TOKEN', TOKEN_PAYLOAD);

        await expect(SecureStorageService.getItem('REFRESH_TOKEN')).resolves.toBe(TOKEN_PAYLOAD);
    });

    it('round-trips a payload whose length is not a multiple of 16 bytes', async () => {
        // The exact case the AES layer threw on: aes-js rejects unpadded plaintext.
        const value = 'x'.repeat(63);
        expect(value.length % 16).not.toBe(0);

        await SecureStorageService.setItem('odd', value);

        await expect(SecureStorageService.getItem('odd')).resolves.toBe(value);
    });

    it('returns null for a key that was never written', async () => {
        await expect(SecureStorageService.getItem('absent')).resolves.toBeNull();
    });

    it('removes a stored value', async () => {
        await SecureStorageService.setItem('doomed', 'value');
        await SecureStorageService.removeItem('doomed');

        await expect(SecureStorageService.getItem('doomed')).resolves.toBeNull();
    });

    it('reads back a value written by a previous instance (cold-start proxy)', async () => {
        await SecureStorageService.setItem('REFRESH_TOKEN', TOKEN_PAYLOAD);

        // A fresh service object, as after a process restart. The old implementation
        // generated its key and IV in the constructor and never persisted them, so a
        // new instance could not decrypt anything the previous one wrote.
        const freshInstance = new (ServiceClass as unknown as new () => typeof SecureStorageService)();

        await expect(freshInstance.getItem('REFRESH_TOKEN')).resolves.toBe(TOKEN_PAYLOAD);
    });

    describe('keychain accessibility', () => {
        it('writes with WHEN_UNLOCKED_THIS_DEVICE_ONLY so the value stays out of device backups', async () => {
            await SecureStorageService.setItem('REFRESH_TOKEN', TOKEN_PAYLOAD);

            // The default, AFTER_FIRST_UNLOCK, is included in encrypted iTunes/Finder
            // backups — a refresh token stored that way is extractable from a backup.
            expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
                'REFRESH_TOKEN',
                TOKEN_PAYLOAD,
                expect.objectContaining({ keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY })
            );
        });

        it('passes the same accessibility on read and delete', async () => {
            await SecureStorageService.getItem('k');
            await SecureStorageService.removeItem('k');

            const expected = expect.objectContaining({
                keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
            });

            expect(SecureStore.getItemAsync).toHaveBeenCalledWith('k', expected);
            expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('k', expected);
        });
    });

    describe('keystore failures', () => {
        it('surfaces a read failure instead of reporting the value as missing', async () => {
            (SecureStore.getItemAsync as jest.Mock).mockRejectedValueOnce(new Error('keystore exploded'));

            // Collapsing this into `null` made an unreadable keystore look exactly like
            // a logged-out user, so the app would silently sign people out.
            await expect(SecureStorageService.getItem('k')).rejects.toBeInstanceOf(SecureStorageUnavailableError);
        });

        it('preserves the underlying error as the cause', async () => {
            const cause = new Error('keystore exploded');
            (SecureStore.setItemAsync as jest.Mock).mockRejectedValueOnce(cause);

            await expect(SecureStorageService.setItem('k', 'v')).rejects.toMatchObject({ cause });
        });
    });

    it('reports availability from the platform rather than by writing a probe value', async () => {
        await expect(SecureStorageService.isSecureStoreAvailable()).resolves.toBe(true);

        // The old check wrote and deleted a real 'test' key on every call.
        expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    });
});
