// Test setup and global configuration
import { beforeAll, afterAll } from 'vitest';
import { existsSync } from 'fs';
import path from 'path';

// Set test environment variables
beforeAll(() => {
  console.log('\n🔧 Setting up test environment...\n');
  
  // Configure environment
  process.env.NODE_ENV = 'test';
  process.env.USE_LOCAL_STORAGE = 'true';
  process.env.MISTRAL_API_KEY = process.env.MISTRAL_API_KEY || 'test-key';
  
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
  console.log('✓ Test environment ready\n');
});

afterAll(() => {
  console.log('\n✓ Test cleanup completed\n');
});

