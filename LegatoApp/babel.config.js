module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Add any additional plugins here
    ],
    // Exclude problematic Node.js modules
    ignore: [
      '**/node_modules/node-cron/**',
      '**/node_modules/cron/**',
      '**/node_modules/events/**',
    ],
  };
}; 