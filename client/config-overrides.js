const webpack = require('webpack');

   module.exports = function override(config) {
     // Polyfills for Node.js core modules
     config.resolve.fallback = {
       buffer: require.resolve('buffer/'),
       stream: require.resolve('stream-browserify'),
       assert: require.resolve('assert/'),
     };

     config.plugins = (config.plugins || []).concat([
       new webpack.ProvidePlugin({
         Buffer: ['buffer', 'Buffer'],
       }),
     ]);

     // Ignore source map warnings for @plotly/mapbox-gl
     config.ignoreWarnings = [/Failed to parse source map/];

     return config;
   };