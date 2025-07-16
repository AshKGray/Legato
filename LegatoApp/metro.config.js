const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Exclude problematic Node.js modules and backend code
config.resolver.blockList = [
  /node-cron/,
  /cron/,
  /events/,
  /^.*\/agents\/.*/,
  /^.*\/index\.js$/,
];

// Ensure we only resolve from the LegatoApp directory
config.resolver.nodeModulesPaths = [
  `${__dirname}/node_modules`,
];

// Add resolver platforms
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

module.exports = config; 