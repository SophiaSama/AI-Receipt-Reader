/**
 * Vite Build Smoke Test
 *
 * Verifies that VITE_API_BASE_URL is correctly inlined by Vite's static
 * replacement when set as an environment variable. This catches the exact bug
 * where `(import.meta as any)?.env?` defeats Vite's static analysis and
 * produces undefined in the production bundle.
 *
 * Usage:  VITE_API_BASE_URL=https://sentinel.test/api node scripts/verify-vite-env-inlining.cjs
 * (Run AFTER `npx vite build`)
 */

const fs = require('fs');
const path = require('path');

const DIST_DIR = path.resolve(__dirname, '..', 'dist', 'assets');
const SENTINEL = process.env.VITE_API_BASE_URL;

if (!SENTINEL) {
  console.error('FAIL: VITE_API_BASE_URL must be set before running this check.');
  console.error('   Usage: VITE_API_BASE_URL=https://sentinel.test/api node scripts/verify-vite-env-inlining.cjs');
  process.exit(1);
}

// Find the JS bundle in dist/assets/
const files = fs.readdirSync(DIST_DIR).filter((f) => f.endsWith('.js'));

if (files.length === 0) {
  console.error('FAIL: No JS bundles found in', DIST_DIR);
  console.error('   Run `npx vite build` first.');
  process.exit(1);
}

let found = false;

for (const file of files) {
  const content = fs.readFileSync(path.join(DIST_DIR, file), 'utf-8');
  if (content.includes(SENTINEL)) {
    console.log(`PASS: VITE_API_BASE_URL ("${SENTINEL}") found in ${file}`);
    found = true;
    break;
  }
}

if (!found) {
  console.error(`FAIL: VITE_API_BASE_URL ("${SENTINEL}") was NOT inlined into any JS bundle.`);
  console.error('   This means import.meta.env.VITE_API_BASE_URL is not being statically replaced by Vite.');
  console.error('   Check that receiptService.ts uses `import.meta.env.VITE_API_BASE_URL` directly');
  console.error('   (NOT via `(import.meta as any)?.env?`).');
  process.exit(1);
}

console.log('PASS: Vite env inlining verified successfully.');
