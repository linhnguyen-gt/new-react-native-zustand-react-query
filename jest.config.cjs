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
    // Grade every source file, not just the ones a test happened to import.
    //
    // Without this, jest's default denominator is "files reachable from a test", which
    // lets coverage grade itself: 20 source files — App.tsx, the providers, the
    // reactotron plugins, the navigation service — were absent from their own score.
    // Two failure modes follow. A new untested module does not move the number at all,
    // because nothing imports it; and deleting a test suite removes the covered files
    // from the denominator along with the tests, so the metric partially self-heals
    // exactly when it should be screaming.
    //
    // The gap was not small. Self-selecting: 67.36 / 60.72 / 60.13 / 68.13.
    // Honest: 60.86 / 48.38 / 54.30 / 61.95. Branch coverage was overstated by 12
    // points.
    collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/__tests__/**', '!**/*.d.ts'],

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
    // Measured 260719 against the honest denominator above: statements 60.86,
    // branches 48.38, functions 54.30, lines 61.95. Raise these as coverage grows;
    // never lower them to make a red build green.
    coverageThreshold: {
        global: {
            statements: 58,
            branches: 45,
            functions: 51,
            lines: 59,
        },
    },
    globals: {
        __DEV__: true,
    },
};
