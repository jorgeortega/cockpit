// Vitest configuration.
// Separate from vite.config.ts so test-only settings (jsdom, globals,
// coverage) never leak into the production build. Vitest picks this file up
// automatically when running `vitest` / `vitest run`.
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    // jsdom gives the component tests a `document` + `window` so Vue can mount.
    environment: 'jsdom',
    // `expect`, `describe`, `it` available globally without imports.
    globals: true,
    // Co-locate tests next to source: src/foo.ts + src/foo.test.ts.
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{ts,vue}'],
      // App bootstrap and test files contribute no production logic.
      exclude: [
        'src/main.ts',
        'src/**/*.{test,spec}.{ts,tsx}',
        'src/vite-env.d.ts',
      ],
      thresholds: {
        lines: 99,
        functions: 99,
        branches: 95,
        statements: 99,
      },
    },
  },
})
