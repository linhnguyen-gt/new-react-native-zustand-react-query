const reactotron = {
    zustand: {
        enhancer: (name, creator) => creator,
    },
};

const RootNavigator = {
    navigate: () => {},
    replaceName: () => {},
    goBack: () => {},
};

module.exports = {
    reactotron,
    RootNavigator,
};
