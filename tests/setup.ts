// Test setup and global configuration
import { beforeAll, afterAll, beforeEach } from 'vitest';
import { existsSync } from 'fs';
import path from 'path';
import { server } from './integration/mswServer';

// Configure environment immediately for module initialization
process.env.NODE_ENV = 'test';
process.env.USE_LOCAL_STORAGE = 'true';
process.env.MISTRAL_API_KEY = process.env.MISTRAL_API_KEY || 'test-key';


// Set test environment variables
beforeAll(async () => {
  // Start MSW server
  server.listen({ onUnhandledRequest: 'warn' });

  // Verify backend build artifacts exist
  const backendDist = path.resolve(process.cwd(), 'backend', 'dist');
  const requiredHandlers = [
    'src/handlers/processReceipt.js',
    'src/handlers/getReceipts.js',
    'src/handlers/manualSave.js',
    'src/handlers/deleteReceipt.js',
  ];

  const missingHandlers = requiredHandlers.filter(
    handler => !existsSync(path.join(backendDist, handler))
  );

  if (missingHandlers.length > 0) {
    console.error('❌ Missing backend build artifacts:');
    missingHandlers.forEach(handler => console.error(`   - ${handler}`));
    console.error('\n💡 Run "npm run pretest" or "npm run build:backend" first\n');
    throw new Error('Backend build artifacts not found. Tests cannot run without compiled backend.');
  }

  console.log('✓ Backend build artifacts verified');
  console.log('✓ Environment variables configured');
  console.log('✓ MSW Server initialized');
  console.log('✓ Test environment ready\n');
});

// Clear in-memory store before each test
beforeEach(async () => {
  try {
    const { clearReceipts } = await import('../api/_lib/receiptsStore.js');
    await clearReceipts();
  } catch (e) {
    // Store may not be available in all tests, that's ok
  }

  // Reset MSW handlers
  server.resetHandlers();
});

afterAll(() => {
  // Close MSW server
  server.close();
  console.log('\n✓ Test cleanup completed\n');
});
