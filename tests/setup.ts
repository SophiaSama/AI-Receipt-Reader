// Test setup and global configuration
import { beforeAll, afterAll, beforeEach } from 'vitest';
import { existsSync } from 'fs';
import path from 'path';
import { server } from './integration/mswServer';

// Configure environment immediately for module initialization
process.env.NODE_ENV = 'test';
process.env.MISTRAL_API_KEY = process.env.MISTRAL_API_KEY || 'test-key';
// Dummy Supabase config so client/server modules can initialize during tests
// (network is mocked via MSW / vi.mock, so these values are never used for real calls).
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
process.env.SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || 'test-anon-key';
process.env.VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://localhost:54321';
process.env.VITE_SUPABASE_PUBLISHABLE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'test-anon-key';


// Set test environment variables
beforeAll(async () => {
  // Start MSW server
  server.listen({ onUnhandledRequest: 'warn' });

  // Verify backend build artifacts exist
  const backendDist = path.resolve(process.cwd(), 'backend', 'dist');
  const requiredHandlers = [
    'src/handlers/processReceipt.js',
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

// Reset MSW handlers before each test
beforeEach(async () => {
  server.resetHandlers();
});

afterAll(() => {
  // Close MSW server
  server.close();
  console.log('\n✓ Test cleanup completed\n');
});
