import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['tests/**/*.test.ts'],
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
        env: {
            USE_LOCAL_STORAGE: 'true',
            AWS_REGION: 'ap-southeast-1',
            AWS_ACCESS_KEY_ID: 'test',
            AWS_SECRET_ACCESS_KEY: 'test',
            MISTRAL_API_KEY: 'test',
        },
    },
});
