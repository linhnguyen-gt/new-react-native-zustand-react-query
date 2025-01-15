module.exports = {
    preset: "react-native",
    moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
    setupFiles: ["<rootDir>/jest.setup.js"],
    transformIgnorePatterns: [
        "node_modules/(?!(react-native" +
            "|@react-native" +
            "|@react-navigation" +
            "|react-native-vector-icons" +
            "|@gluestack-ui" +
            "|react-native-css-interop" +
            "|react-redux" +
            "|@react-native-aria" +
            "|react-native-config" +
            "|@react-native-async-storage" +
            "|reactotron-react-native" +
            "|reactotron-redux" +
            "|reactotron-redux-saga" +
            "|reactotron-core-client" +
            "|@gluestack-ui/overlay" +
            "|@gluestack-ui/toast" +
            "|@gluestack-ui/image" +
            "|@gluestack-ui/nativewind-utils" +
            "|nativewind" +
            "|expo-constants" +
            ")/)"
    ],
    moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
        "\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$":
            "<rootDir>/__mocks__/fileMock.js",
        "\\.(css|less)$": "<rootDir>/__mocks__/styleMock.js"
    },
    setupFilesAfterEnv: ["@testing-library/jest-native/extend-expect"],
    testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/.history/"],
    globals: {
        __DEV__: true
    }
};
