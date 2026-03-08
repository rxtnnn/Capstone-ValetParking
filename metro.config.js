const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Polyfill Node standard library modules not available in React Native
config.resolver.extraNodeModules = {
  buffer: require.resolve('buffer'),
};

module.exports = config;
