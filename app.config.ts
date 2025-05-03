import * as dotenv from "dotenv";
import { ConfigContext, ExpoConfig } from "expo/config";

import { name } from "./package.json";

const getEnvPath = (env: string | undefined): string => {
    switch (env?.toLowerCase()) {
        case "production":
            return ".env.production";
        case "staging":
            return ".env.staging";
        default:
            return ".env";
    }
};

const loadEnvFile = (path: string) => {
    try {
        const env = dotenv.config({ path }).parsed;
        if (!env) throw new Error(`Empty env file: ${path}`);
        return env;
    } catch (error) {
        console.warn(`Failed to load ${path}:`, error);
        return null;
    }
};

const validateEnvConfig = (env: Record<string, any>) => {
    const coreRequiredVars = ["APP_FLAVOR", "VERSION_CODE", "VERSION_NAME", "API_URL", "APP_NAME"];

    const missingVars = coreRequiredVars.filter((key) => !env[key]);
    if (missingVars.length > 0) {
        throw new Error(`Missing required env variables: ${missingVars.join(", ")}`);
    }

    const emptyVars = Object.entries(env)
        .filter(([_, value]) => value === undefined || value === "")
        .map(([key]) => key);

    if (emptyVars.length > 0) {
        throw new Error(`Empty values for environment variables: ${emptyVars.join(", ")}`);
    }

    return env;
};

export default ({ config }: ConfigContext): ExpoConfig => {
    const envPath = getEnvPath(process.env.APP_ENV);
    const envConfig = loadEnvFile(envPath);

    if (!envConfig) {
        throw new Error(`Failed to load environment config from ${envPath}`);
    }

    const validatedConfig = validateEnvConfig(envConfig);

    return {
        ...config,
        name,
        slug: name.toLowerCase(),
        version: validatedConfig.VERSION_NAME,
        extra: {
            ...validatedConfig
        },
        ios: {
            buildNumber: validatedConfig.VERSION_CODE
        },
        android: {
            versionCode: parseInt(validatedConfig.VERSION_CODE, 10)
        }
    };
};
