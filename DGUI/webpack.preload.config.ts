import type { Configuration } from 'webpack';
import { rules } from './webpack.rules';

export const preloadConfig: Configuration = {
  module: {
    rules,
  },
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css', '.json'],
    fallback: {
        "fs": require.resolve("fs"),
        "util": require.resolve("util/")
    }
  },
  // Critical change - set to 'electron-preload' instead of using node preset
  target: 'node'
};