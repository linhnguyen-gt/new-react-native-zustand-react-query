declare module "@env" {
    export interface ExpoConfig {
        extra: {
            APP_FLAVOR: "development" | "staging" | "production";
            VERSION_CODE: string;
            VERSION_NAME: string;
            API_URL: string;
            APP_NAME: string;
        };
    }
}
