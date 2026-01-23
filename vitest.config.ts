import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['api/**/*.ts', 'backend/src/**/*.ts'],
      exclude: ['backend/dist/**', 'backend/local/**', 'tests/**'],
    },
    testTimeout: 30000, // 30 seconds for API calls
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
      '@api': resolve(__dirname, './api'),
      '@backend': resolve(__dirname, './backend/src'),
    },
  },
});
