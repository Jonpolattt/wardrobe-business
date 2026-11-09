import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// SWC keeps decorator metadata, which NestJS dependency injection relies on.
export default defineConfig({
  plugins: [
    swc.vite({
      module: { type: 'es6' },
      jsc: {
        target: 'es2022',
        parser: { syntax: 'typescript', decorators: true },
        transform: { legacyDecorator: true, decoratorMetadata: true },
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.spec.ts', 'test/**/*.e2e-spec.ts'],
    globalSetup: ['test/support/global-setup.ts'],
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
});
