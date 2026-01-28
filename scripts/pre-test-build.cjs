#!/usr/bin/env node
/**
 * Pre-Test Build Script
 * 
 * This script ensures all dependencies are built before running tests.
 * It checks for required build artifacts and builds them if missing.
 */

const { execSync } = require('child_process');
const { existsSync } = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const backendDir = path.join(rootDir, 'backend');
const backendDistDir = path.join(backendDir, 'dist');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logStep(step) {
  log(`\n${colors.bright}${colors.blue}▶ ${step}${colors.reset}`);
}

function logSuccess(message) {
  log(`${colors.green}✓ ${message}${colors.reset}`);
}

function logWarning(message) {
  log(`${colors.yellow}⚠ ${message}${colors.reset}`);
}

function logError(message) {
  log(`${colors.red}✗ ${message}${colors.reset}`);
}

function checkBackendDist() {
  const requiredFiles = [
    path.join(backendDistDir, 'src', 'handlers', 'processReceipt.js'),
    path.join(backendDistDir, 'src', 'handlers', 'getReceipts.js'),
    path.join(backendDistDir, 'src', 'handlers', 'manualSave.js'),
    path.join(backendDistDir, 'src', 'handlers', 'deleteReceipt.js'),
    path.join(backendDistDir, 'src', 'handlers', 'batchDeleteReceipts.js'),
  ];

  return requiredFiles.every(file => existsSync(file));
}

function buildBackend() {
  logStep('Building Backend TypeScript');

  try {
    // Check if backend/node_modules exists
    const backendNodeModules = path.join(backendDir, 'node_modules');
    if (!existsSync(backendNodeModules)) {
      log('  Installing backend dependencies...');
      execSync('npm install', {
        cwd: backendDir,
        stdio: 'inherit',
        encoding: 'utf-8'
      });
    } else {
      log('  Backend dependencies already installed');
    }

    // Build backend
    log('  Compiling TypeScript...');
    execSync('npm run build', {
      cwd: backendDir,
      stdio: 'inherit',
      encoding: 'utf-8'
    });

    logSuccess('Backend built successfully');
    return true;
  } catch (error) {
    logError('Backend build failed');
    console.error(error.message);
    return false;
  }
}

function checkRootDependencies() {
  const nodeModulesDir = path.join(rootDir, 'node_modules');
  const vitestPath = path.join(nodeModulesDir, 'vitest');
  return existsSync(nodeModulesDir) && existsSync(vitestPath);
}

function installRootDependencies() {
  logStep('Installing Root Dependencies');

  try {
    execSync('npm install', {
      cwd: rootDir,
      stdio: 'inherit',
      encoding: 'utf-8'
    });
    logSuccess('Root dependencies installed');
    return true;
  } catch (error) {
    logError('Failed to install root dependencies');
    console.error(error.message);
    return false;
  }
}

function main() {
  log(`\n${colors.bright}═══════════════════════════════════════════════════${colors.reset}`);
  log(`${colors.bright}${colors.blue}  Pre-Test Build & Dependency Check${colors.reset}`);
  log(`${colors.bright}═══════════════════════════════════════════════════${colors.reset}\n`);

  let hasErrors = false;

  // Step 1: Check and install root dependencies
  logStep('Checking Root Dependencies');
  if (!checkRootDependencies()) {
    logWarning('Root dependencies missing or incomplete');
    if (!installRootDependencies()) {
      hasErrors = true;
    }
  } else {
    logSuccess('Root dependencies are ready');
  }

  // Step 2: Check and build backend
  logStep('Checking Backend Build Artifacts');
  if (!checkBackendDist()) {
    logWarning('Backend build artifacts missing or incomplete');
    if (!buildBackend()) {
      hasErrors = true;
    }
  } else {
    logSuccess('Backend build artifacts are ready');
  }

  // Step 3: Verify all required files exist
  logStep('Verifying Test Prerequisites');
  const requiredPaths = [
    { path: path.join(backendDistDir, 'src', 'handlers'), name: 'Backend handlers' },
    { path: path.join(backendDistDir, 'src', 'services'), name: 'Backend services' },
    { path: path.join(backendDistDir, 'src', 'utils'), name: 'Backend utilities' },
  ];

  let allPathsExist = true;
  for (const { path: checkPath, name } of requiredPaths) {
    if (existsSync(checkPath)) {
      logSuccess(`${name} ready`);
    } else {
      logError(`${name} not found at ${checkPath}`);
      allPathsExist = false;
    }
  }

  // Final status
  log(`\n${colors.bright}═══════════════════════════════════════════════════${colors.reset}`);
  if (hasErrors || !allPathsExist) {
    logError('Pre-test build completed with errors');
    log(`${colors.bright}═══════════════════════════════════════════════════${colors.reset}\n`);
    process.exit(1);
  } else {
    logSuccess('All prerequisites ready for testing!');
    log(`${colors.bright}═══════════════════════════════════════════════════${colors.reset}\n`);
    process.exit(0);
  }
}

main();
