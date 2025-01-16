export const reactotron = {
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
};
