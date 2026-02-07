import { defineConfig } from '@rslib/core';

export default defineConfig({
  lib: [
    {
      format: 'esm',
      syntax: ['node 22'],
      source: {
        entry: {
          cli: './src/cli.ts',
        },
      },
    },
  ],
});
