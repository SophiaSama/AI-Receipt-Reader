// Test setup and global configuration
import { beforeAll, afterAll } from 'vitest';

// Set test environment variables
beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.USE_LOCAL_STORAGE = 'true';
  process.env.MISTRAL_API_KEY = process.env.MISTRAL_API_KEY || 'test-key';
});

afterAll(() => {
  // Cleanup if needed
});
