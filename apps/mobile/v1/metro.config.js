const { getSentryExpoConfig } = require("@sentry/react-native/metro");

// getSentryExpoConfig wraps the default Expo config, which includes expo-router support
const config = getSentryExpoConfig(__dirname);

module.exports = config;
