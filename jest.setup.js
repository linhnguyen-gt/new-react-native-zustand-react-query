import "react-native-gesture-handler/jestSetup";

jest.mock("@/data/services/reactotron", () => ({
    reactotron: {
        zustand: {
            enhancer: (storeName, config) => config
        },
        query: {
            client: {
                getQueryCache: () => ({
                    subscribe: () => {}
                })
            }
        },
        api: {
            logRequest: () => {}
        }
    }
}));
