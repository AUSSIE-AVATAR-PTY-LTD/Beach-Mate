const { getDefaultConfig } = require("expo/metro-config");
const config = getDefaultConfig(__dirname);
config.symbolicator = { customizeFrame: () => null };
module.exports = config;
