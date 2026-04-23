const path = require('path');
const fs = require('fs');

/**
 * Module-Federation-friendly webpack config for a Superset dynamic plugin.
 *
 * The output exposes a single UMD bundle that Superset loads at runtime when
 * the plugin is registered via /api/v1/dynamic_plugins/. Peer dependencies
 * (react, @superset-ui/*) are marked external so the host page provides them
 * — this is required so the plugin shares React state with Superset.
 *
 * The bundle filename embeds a content hash so every rebuild produces a
 * fresh URL and Superset's dynamic-plugin cache (keyed on URL) picks up the
 * new code. The resolved URL is written to `dist/bundle-url.txt` so the
 * Compose `plugin-builder` flow can feed it into the reconciler.
 */

const PLUGIN_NAME = 'state-district-pies';
const STATIC_MOUNT_PATH = `/static/assets/plugins/${PLUGIN_NAME}`;

class WriteBundleUrlPlugin {
  constructor(staticPath, pluginName) {
    this.staticPath = staticPath;
    this.pluginName = pluginName;
  }
  apply(compiler) {
    compiler.hooks.done.tap('WriteBundleUrlPlugin', (stats) => {
      const assets = Object.keys(stats.compilation.assets);
      const main = assets.find((a) => /^main\.[^.]+\.js$/.test(a));
      if (!main) return;

      // Write to plugin-specific subdirectory for auto-discovery
      // e.g., dist/state-district-pies/bundle-url.txt
      const outDir = compiler.options.output.path;
      const pluginDir = path.join(outDir, this.pluginName);

      if (!fs.existsSync(pluginDir)) {
        fs.mkdirSync(pluginDir, { recursive: true });
      }

      fs.writeFileSync(path.join(pluginDir, 'bundle-url.txt'), `${this.staticPath}/${main}`);
      fs.writeFileSync(path.join(pluginDir, 'bundle-name.txt'), main);
    });
  }
}

module.exports = (_env, argv) => ({
  entry: './src/index.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'main.[contenthash].js',
    library: {
      type: 'umd',
      name: 'StateDistrictPiesPlugin',
    },
    globalObject: 'this',
    clean: true,
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
    'react/jsx-runtime': 'react/jsx-runtime',
    'react/jsx-dev-runtime': 'react/jsx-dev-runtime',
    'react-dom': 'react-dom',
    '@superset-ui/core': '@superset-ui/core',
    '@superset-ui/chart-controls': '@superset-ui/chart-controls',
  },
  plugins: [new WriteBundleUrlPlugin(STATIC_MOUNT_PATH, PLUGIN_NAME)],
  devServer: {
    static: path.resolve(__dirname, 'dist'),
    port: 8080,
    allowedHosts: 'all',
    headers: { 'Access-Control-Allow-Origin': '*' },
  },
  devtool: argv.mode === 'production' ? 'source-map' : 'eval-source-map',
});
