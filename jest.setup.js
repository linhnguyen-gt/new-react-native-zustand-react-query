import 'react-native-gesture-handler/jestSetup';

jest.mock('expo-constants', () => ({
    default: {
        expoConfig: {
            extra: {
                API_URL: 'https://api.example.com',
                APP_FLAVOR: 'development',
                VERSION_NAME: '1.0.0',
                VERSION_CODE: '1',
            },
        },
    },
}));

jest.mock('@/data/services/reactotron', () => ({
    reactotron: {
        query: {
            client: {
                getQueryCache: () => ({
                    subscribe: jest.fn(),
                }),
                getMutationCache: () => ({
                    subscribe: jest.fn(),
                }),
            },
        },
        zustand: {
            enhancer: jest.fn((storeName, storeCreator) => storeCreator),
        },
        log: jest.fn(),
    },
}));

jest.mock('@/data/services/navigation', () => ({
    RootNavigator: {
        navigationRef: {
            current: {
                navigate: jest.fn(),
                goBack: jest.fn(),
                reset: jest.fn(),
            },
        },
        navigate: jest.fn(),
        goBack: jest.fn(),
        reset: jest.fn(),
        replaceName: jest.fn(),
    },
}));
