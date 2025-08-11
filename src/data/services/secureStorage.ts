import AES from 'aes-js';
import * as SecureStore from 'expo-secure-store';
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

export class SecureStorageService {
    private static instance: SecureStorageService;
    private encryptionKey: Uint8Array;
    private iv: Uint8Array;

    private constructor() {
        const keyArray = new Uint8Array(32);
        crypto.getRandomValues(keyArray);
        this.encryptionKey = keyArray;

        this.iv = new Uint8Array(16);
        crypto.getRandomValues(this.iv);
    }

    static getInstance(): SecureStorageService {
        if (!SecureStorageService.instance) {
            SecureStorageService.instance = new SecureStorageService();
        }
        return SecureStorageService.instance;
    }

    private encrypt(data: string): string {
        try {
            const textBytes = AES.utils.utf8.toBytes(data);
            const aesCbc = new AES.ModeOfOperation.cbc(this.encryptionKey, this.iv);
            const encryptedBytes = aesCbc.encrypt(textBytes);
            return AES.utils.hex.fromBytes(encryptedBytes);
        } catch (error) {
            throw new Error('Failed to encrypt data');
        }
    }

    private decrypt(encryptedData: string): string {
        try {
            const encryptedBytes = AES.utils.hex.toBytes(encryptedData);
            const aesCbc = new AES.ModeOfOperation.cbc(this.encryptionKey, this.iv);
            const decryptedBytes = aesCbc.decrypt(encryptedBytes);
            return AES.utils.utf8.fromBytes(decryptedBytes);
        } catch (error) {
            throw new Error('Failed to decrypt data');
        }
    }

    async setItem(key: string, value: string): Promise<void> {
        try {
            const encryptedValue = this.encrypt(value);
            await SecureStore.setItemAsync(key, encryptedValue);
        } catch (error) {
            throw new Error('Secure storage is not available on this device');
        }
    }

    async getItem(key: string): Promise<string | null> {
        try {
            const encryptedValue = await SecureStore.getItemAsync(key);

            if (!encryptedValue) return null;

            try {
                return this.decrypt(encryptedValue);
            } catch (decryptError) {
                return null;
            }
        } catch (error) {
            throw new Error('Secure storage is not available on this device');
        }
    }

    async removeItem(key: string): Promise<void> {
        try {
            await SecureStore.deleteItemAsync(key);
        } catch (error) {
            throw new Error('Secure storage is not available on this device');
        }
    }

    async isSecureStoreAvailable(): Promise<boolean> {
        try {
            await SecureStore.setItemAsync('test', 'test');
            await SecureStore.deleteItemAsync('test');
            return true;
        } catch {
            return false;
        }
    }
}

export default SecureStorageService.getInstance();
