import Constants from 'expo-constants';
// eslint-disable-next-line import/order
import { ExpoConfig } from 'expo/config';
import { z } from 'zod';

class EnvironmentService {
    private static instance: EnvironmentService;
    private config: ExpoConfig['extra'];

    private constructor() {
        const extra = Constants.expoConfig?.extra;
        if (!extra) {
            throw new Error('Missing Expo configuration');
        }

        try {
            this.config = extra;
        } catch (error) {
            if (error instanceof z.ZodError) {
                const issues = error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
                throw new Error(`Invalid environment config: ${issues.join(', ')}`);
            }
            throw error;
        }
    }

    static getInstance(): EnvironmentService {
        if (!this.instance) {
            this.instance = new EnvironmentService();
        }
        return this.instance;
    }

    get apiBaseUrl(): string {
        return this.config?.API_URL;
    }

    get appFlavor(): string {
        return this.config?.APP_FLAVOR;
    }

    get versionName(): string {
        return this.config?.VERSION_NAME;
    }

    get versionCode(): string {
        return this.config?.VERSION_CODE;
    }

    isDevelopment(): boolean {
        return this.config?.APP_FLAVOR === 'development';
    }

    isStaging(): boolean {
        return this.config?.APP_FLAVOR === 'staging';
    }

    isProduction(): boolean {
        return this.config?.APP_FLAVOR === 'production';
    }
}

const environmentService = EnvironmentService.getInstance();
export { environmentService as environment };
