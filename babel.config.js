module.exports = function (api) {
    api.cache(true);
    return {
        presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
        plugins: [
            [
                'module-resolver',
                {
                    extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
                    alias: {
                        '@': './src',
                        '@app': './src/app',
                        '@data': './src/data',
                        '@presentation': './src/presentation',
                        '@shared': './src/shared',
                    },
                },
            ],
            'react-native-worklets/plugin',
        ],
    };
};
