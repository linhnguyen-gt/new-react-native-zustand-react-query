import * as SecureStore from 'expo-secure-store';

/**
 * Keychain accessibility for every value this service writes.
 *
 * `setItemAsync` without options defaults to `AFTER_FIRST_UNLOCK`, which iOS *does*
 * include in encrypted iTunes/Finder backups. A refresh token stored that way is a
 * plaintext bearer credential with a 7-day TTL and no device binding, extractable from
 * a backup of the device.
 *
 * `WHEN_UNLOCKED_THIS_DEVICE_ONLY` keeps the entry out of backups and out of any
 * restore onto a different device.
 *
 * Android needs no equivalent here: expo-secure-store ships backup rules
 * (`secure_store_backup_rules.xml` / `secure_store_data_extraction_rules.xml`, merged
 * from the library) that exclude the `SecureStore` shared-preferences file from Auto
 * Backup, which is why `allowBackup="true"` in the manifest is not a leak.
 */
const KEYCHAIN_OPTIONS: SecureStore.SecureStoreOptions = {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

/**
 * Raised when the platform keystore itself is unusable — a simulator without a
 * keychain, a device with no secure hardware. Distinct from a value simply being
 * absent, and distinct from a malformed value.
 */
export class SecureStorageUnavailableError extends Error {
    /** Declared explicitly: `Error.cause` needs the ES2022 lib, which this project does not target. */
    readonly cause?: unknown;

    constructor(operation: string, cause?: unknown) {
        super(`Secure storage is unavailable on this device (during ${operation})`);
        this.name = 'SecureStorageUnavailableError';
        this.cause = cause;
    }
}

/**
 * Thin wrapper over expo-secure-store.
 *
 * There used to be an AES-CBC layer here. It never worked: it encrypted raw UTF-8 with
 * no padding, and aes-js rejects any plaintext that is not a multiple of 16 bytes — the
 * 63-byte token payload threw on every write. The key and IV were also generated in the
 * constructor and never persisted, so even a successful write could not survive a
 * restart. Both faults were swallowed and reported as "storage is not available".
 *
 * The platform keystore (iOS Keychain / Android Keystore-backed EncryptedSharedPrefs)
 * already provides at-rest encryption, so the layer bought nothing even in principle.
 */
export class SecureStorageService {
    private static instance: SecureStorageService;

    static getInstance(): SecureStorageService {
        if (!SecureStorageService.instance) {
            SecureStorageService.instance = new SecureStorageService();
        }
        return SecureStorageService.instance;
    }

    async setItem(key: string, value: string): Promise<void> {
        try {
            await SecureStore.setItemAsync(key, value, KEYCHAIN_OPTIONS);
        } catch (error) {
            throw new SecureStorageUnavailableError('write', error);
        }
    }

    /**
     * Returns `null` when the key is absent. A genuine keystore failure throws rather
     * than reporting the value as missing — the previous version collapsed both into
     * `null`, so an unreadable keystore looked exactly like a logged-out user.
     */
    async getItem(key: string): Promise<string | null> {
        try {
            return await SecureStore.getItemAsync(key, KEYCHAIN_OPTIONS);
        } catch (error) {
            throw new SecureStorageUnavailableError('read', error);
        }
    }

    async removeItem(key: string): Promise<void> {
        try {
            await SecureStore.deleteItemAsync(key, KEYCHAIN_OPTIONS);
        } catch (error) {
            throw new SecureStorageUnavailableError('delete', error);
        }
    }

    async isSecureStoreAvailable(): Promise<boolean> {
        try {
            return await SecureStore.isAvailableAsync();
        } catch {
            return false;
        }
    }
}

export default SecureStorageService.getInstance();
