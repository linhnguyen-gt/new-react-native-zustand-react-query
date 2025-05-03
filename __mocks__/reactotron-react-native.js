const reactotron = {
    configure: () => reactotron,
    useReactNative: () => reactotron,
    use: () => reactotron,
    connect: () => reactotron,
    clear: () => null,
    createEnhancer: () => () => (next) => (reducer) => next(reducer),
    createSagaMonitor: () => ({}),
    setAsyncStorageHandler: () => reactotron
};

export default reactotron;
