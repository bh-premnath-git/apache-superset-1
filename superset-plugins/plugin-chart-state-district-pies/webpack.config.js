const path = require('path');

/**
 * Module-Federation-friendly webpack config for a Superset dynamic plugin.
 *
 * The output exposes a single UMD bundle that Superset loads at runtime when
 * the plugin is registered via /api/v1/dynamic_plugins/. Peer dependencies
 * (react, @superset-ui/*) are marked external so the host page provides them
 * — this is required so the plugin shares React state with Superset.
 */
module.exports = (_env, argv) => ({
  entry: './src/index.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'main.js',
    library: {
      type: 'umd',
      name: 'StateDistrictPiesPlugin',
    },
    globalObject: 'this',
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx|js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              '@babel/preset-env',
              ['@babel/preset-react', { runtime: 'automatic' }],
              '@babel/preset-typescript',
            ],
          },
        },
      },
    ],
  },
  externals: {
    react: 'react',
    'react-dom': 'react-dom',
    '@superset-ui/core': '@superset-ui/core',
    '@superset-ui/chart-controls': '@superset-ui/chart-controls',
  },
  devServer: {
    static: path.resolve(__dirname, 'dist'),
    port: 8080,
    allowedHosts: 'all',
    headers: { 'Access-Control-Allow-Origin': '*' },
  },
  devtool: argv.mode === 'production' ? 'source-map' : 'eval-source-map',
});
