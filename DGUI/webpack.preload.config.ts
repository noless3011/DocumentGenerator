import type { Configuration } from 'webpack';
import { rules } from './webpack.rules';

export const preloadConfig: Configuration = {
  module: {
    rules,
  },
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css', '.json'],
  },
  // Set the target to 'electron-preload'
  target: 'electron-preload',
  // Mark Node.js built-in modules as external
  externals: {
    'fs': 'commonjs fs',
    'path': 'commonjs path',
    'electron': 'commonjs electron'
  }
};