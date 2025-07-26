const { getDefaultConfig } = require('@expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const { wrapWithReanimatedMetroConfig } = require('react-native-reanimated/metro-config');
/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
let config = getDefaultConfig(__dirname);

config.resolver.unstable_enablePackageExports = false;

config = withNativeWind(config, {
    input: './global.css',
});

module.exports = wrapWithReanimatedMetroConfig(config);
