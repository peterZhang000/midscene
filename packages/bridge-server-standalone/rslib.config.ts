import { defineConfig } from '@rslib/core';

export default defineConfig({
  lib: [
    {
      format: 'cjs',
      output: {
        distPath: {
          root: './dist',
        },
      },
      dts: {
        bundle: true,
      },
    },
  ],
  source: {
    entry: {
      index: './src/index.ts',
      cli: './src/cli.ts',
    },
  },
  output: {
    target: 'node',
  },
});


