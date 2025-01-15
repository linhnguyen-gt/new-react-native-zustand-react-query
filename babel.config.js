module.exports = {
    presets: ["module:@react-native/babel-preset", "nativewind/babel"],
    plugins: [
        [
            "module-resolver",
            {
                extensions: [".ios.js", ".android.js", ".js", ".ts", ".tsx", ".json"],
                alias: {
                    "@": "./src"
                }
            },
            "react-native-reanimated/plugin"
        ]
    ]
};
