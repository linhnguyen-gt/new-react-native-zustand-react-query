#!/usr/bin/env node

/**
 * Test script for Expo Updates
 * Usage: node scripts/test-update.js
 *
 * This script helps you test the OTA update flow locally
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');

console.log('🧪 Expo Updates Test Script\n');
console.log('═══════════════════════════════════════════════════════════\n');

// Check prerequisites
console.log('📋 Prerequisites Check:\n');

// 1. Check if EAS CLI is installed
let easInstalled = false;
try {
    execSync('eas --version', { stdio: 'pipe' });
    easInstalled = true;
    console.log('  ✅ EAS CLI installed');
} catch {
    console.log('  ❌ EAS CLI not installed');
    console.log('     Run: npm install -g eas-cli\n');
}

// 2. Check if logged in to Expo
try {
    execSync('eas whoami', { stdio: 'pipe' });
    console.log('  ✅ Logged in to Expo');
} catch {
    console.log('  ❌ Not logged in to Expo');
    console.log('     Run: eas login\n');
}

// 3. Check environment variables
const envPath = path.join(PROJECT_ROOT, '.env');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const hasProjectId = envContent.includes('EXPO_PROJECT_ID');
    const hasUpdateUrl = envContent.includes('EXPO_UPDATE_URL');

    if (hasProjectId && hasUpdateUrl) {
        console.log('  ✅ Environment variables configured');
    } else {
        console.log('  ❌ Missing Expo Updates environment variables');
        console.log('     Run: yarn env:setup\n');
    }
} else {
    console.log('  ❌ .env file not found');
    console.log('     Run: yarn env:setup\n');
}

console.log('\n═══════════════════════════════════════════════════════════\n');

// Test steps
console.log('📝 Test Steps:\n');

console.log('Step 1: Build a development client');
console.log('  Command: yarn android:dev  # or yarn ios:dev');
console.log('  Note: This creates the native binary that will receive updates\n');

console.log('Step 2: Make a small code change');
console.log('  Example: Edit src/App.tsx and change some text\n');

console.log('Step 3: Publish an update');
console.log('  Command: yarn update:push');
console.log('  Channel: development');
console.log('  Message: "Test update 1"\n');

console.log('Step 4: Test on device/simulator');
console.log('  - Kill the app if running');
console.log('  - Reopen the app');
console.log('  - You should see the update modal');
console.log('  - Tap "Restart Now" to apply\n');

console.log('Step 5: Verify update applied');
console.log('  - Check if your code change is visible\n');

console.log('═══════════════════════════════════════════════════════════\n');

console.log('🔧 Alternative: Quick Local Test\n');
console.log('If you want to test without publishing:');
console.log('  1. Run: yarn start --clear');
console.log('  2. Open app on device');
console.log('  3. Make code change');
console.log('  4. Save file (hot reload)');
console.log('  Note: This tests JS bundle update, not OTA update\n');

console.log('═══════════════════════════════════════════════════════════\n');

console.log('📚 Documentation:');
console.log('  - See docs/EXPO_UPDATES.md for full guide');
console.log('  - Visit: https://docs.expo.dev/eas-update/introduction/\n');
