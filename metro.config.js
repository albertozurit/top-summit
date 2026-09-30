// Learn more https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Glyphs de MapLibre (.pbf) se empaquetan como assets y se copian a Documents al arrancar.
config.resolver.assetExts.push('pbf');
config.resolver.blockList = [/\/pipeline\/.*/, /\/\.tools\/.*/];

module.exports = config;
