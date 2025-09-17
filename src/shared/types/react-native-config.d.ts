declare module 'react-native-config' {
    export interface NativeConfig {
        APP_FLAVOR: 'development' | 'staging' | 'production';
        VERSION_CODE: string;
        VERSION_NAME: string;
        API_URL: string;
        APP_NAME: string;
        [key: string]: string;
    }

    const Config: NativeConfig;
    export default Config;
}
