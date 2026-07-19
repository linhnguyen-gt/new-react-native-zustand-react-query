module.exports = {
    preset: '@react-native/jest-preset',
    transform: {
        '^.+.(js|jsx|ts|tsx)$': 'babel-jest',
    },
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    setupFiles: ['<rootDir>/jest.setup.js'],
    transformIgnorePatterns: [
        'node_modules/(?!(react-native' +
            '|@react-native' +
            '|@react-navigation' +
            '|react-native-vector-icons' +
            '|@gluestack-ui' +
            '|react-native-css-interop' +
            '|react-redux' +
            '|@react-native-aria' +
            '|@react-native-async-storage' +
            '|reactotron-react-native' +
            '|reactotron-redux' +
            '|reactotron-redux-saga' +
            '|reactotron-core-client' +
            '|@gluestack-ui/overlay' +
            '|@gluestack-ui/button' +
            '|@gluestack-ui/toast' +
            '|@gluestack-ui/image' +
            '|@gluestack-ui/icon' +
            '|@gluestack-ui/nativewind-utils' +
            '|@legendapp/motion' +
            '|nativewind' +
            '|expo-constants' +
            '|expo-secure-store' +
            '|react-native-get-random-values' +
            '|react-native-url-polyfill' +
            '|react-native-gesture-handler' +
            '|react-native-reanimated' +
            '|react-native-svg' +
            '|react-native-safe-area-context' +
            '|react-native-screens' +
            ')/)',
    ],
    moduleNameMapper: {
        '^@/data/services$': '<rootDir>/__mocks__/@/data/services.js',
        '^@/(.*)$': '<rootDir>/src/$1',
        '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
            '<rootDir>/__mocks__/fileMock.js',
        '\\.(css|less)$': '<rootDir>/__mocks__/styleMock.js',
        '^@react-native-vector-icons/(.*)$': '<rootDir>/__mocks__/react-native-vector-icons.js',
    },
    setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
    testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.history/', '<rootDir>/.opencode/'],
    // Ratchet, not a target.
    //
    // `test:ci` has always run --coverage and uploaded to Codecov, but nothing
    // enforced the number, so it could fall indefinitely and only ever be noticed by
    // someone reading a dashboard.
    //
    // Set deliberately a few points BELOW the measured figures rather than at them.
    // A floor equal to current coverage turns the next legitimate refactor red on
    // arrival, and a threshold that cries wolf gets deleted — which recreates the
    // blind spot it was meant to close. The gap absorbs ordinary movement while
    // still catching a real slide.
    //
    // Measured after the dead-code removal settled (260719): statements 67.36,
    // branches 60.72, functions 60.13, lines 68.13. Raise these as coverage grows;
    // never lower them to make a red build green.
    coverageThreshold: {
        global: {
            statements: 65,
            branches: 58,
            functions: 58,
            lines: 65,
        },
    },
    globals: {
        __DEV__: true,
    },
};
