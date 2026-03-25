#!/usr/bin/env node

/**
 * Push OTA update to Expo using EAS
 * Usage: node scripts/push-update.js
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const CHANNELS = {
    d: 'development',
    s: 'staging',
    p: 'production',
};

const ENV_FILES = {
    development: '.env',
    staging: '.env.staging',
    production: '.env.production',
};

const PLATFORMS = {
    a: 'android',
    i: 'ios',
    all: 'all',
};

function loadEnvFile(channel) {
    const envFile = ENV_FILES[channel];
    const envPath = path.resolve(__dirname, '..', envFile);

    if (fs.existsSync(envPath)) {
        console.log(`📄 Loading environment from ${envFile}`);
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split('\n').forEach((line) => {
            const [key, ...valueParts] = line.split('=');
            if (key && valueParts.length > 0 && !key.startsWith('#')) {
                process.env[key.trim()] = valueParts.join('=').trim();
            }
        });
        return true;
    } else {
        console.warn(`⚠️  ${envFile} not found, using existing environment variables`);
        return false;
    }
}

function validateEnvVars(channel) {
    const required = ['EXPO_PROJECT_ID', 'EXPO_UPDATE_URL'];
    const missing = required.filter((key) => !process.env[key]);

    if (missing.length > 0) {
        console.warn(`⚠️  Missing env vars for ${channel}: ${missing.join(', ')}`);
        console.warn('   EAS CLI may fail or use default values.');
        return false;
    }
    return true;
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

const PROJECT_ROOT = path.resolve(__dirname, '..');

async function main() {
    console.log('🚀 Expo OTA Update Publisher\n');

    let channel;
    while (!channel) {
        const input = (await question('Select channel (d=development, s=staging, p=production): '))
            .trim()
            .toLowerCase();
        channel = CHANNELS[input];
        if (!channel) {
            console.log('❌ Invalid input. Please enter d, s, or p.');
        }
    }
    console.log(`✓ Channel: ${channel}\n`);

    loadEnvFile(channel);
    validateEnvVars(channel);

    // Get message
    let message;
    while (!message) {
        message = (await question('Enter update message: ')).trim();
        if (!message) {
            console.log('❌ Message is required.');
        }
    }
    console.log(`✓ Message: ${message}\n`);

    // Get platform
    let platform;
    while (!platform) {
        const input = (await question('Select platform (all, a=android, i=ios): ')).trim().toLowerCase();
        platform = PLATFORMS[input];
        if (!platform) {
            console.log('❌ Invalid input. Please enter all, a, or i.');
        }
    }
    console.log(`✓ Platform: ${platform}\n`);

    // Confirm
    const confirm = (await question(`Publish update to ${channel} for ${platform}? (y/N): `)).trim().toLowerCase();
    if (confirm !== 'y' && confirm !== 'yes') {
        console.log('❌ Cancelled.');
        process.exit(0);
    }

    console.log('\n📦 Publishing update...\n');

    // Sanitize message to prevent shell injection
    const sanitizedMessage = message.replace(/["\\]/g, '');

    // Build EAS command arguments
    // --channel: Assign update to this channel
    // --environment: Required for SDK 55+ in non-interactive mode
    const args = [
        'update',
        `--channel=${channel}`,
        `--environment=${channel}`,
        `--message=${sanitizedMessage}`,
        '--non-interactive',
    ];
    if (platform !== 'all') {
        args.push(`--platform=${platform}`);
    }

    try {
        // Execute EAS using spawn for security
        const child = spawn('npx', ['--yes', 'eas-cli', ...args], {
            cwd: PROJECT_ROOT,
            stdio: 'inherit',
            env: { ...process.env },
        });

        await new Promise((resolve, reject) => {
            child.on('close', (code) => {
                if (code === 0) {
                    console.log('\n✅ Update published successfully!');
                    resolve();
                } else {
                    reject(new Error(`EAS process exited with code ${code}`));
                }
            });

            child.on('error', (err) => {
                reject(err);
            });
        });
    } catch (error) {
        console.error('\n❌ Failed to publish update:', error.message);
        process.exit(1);
    } finally {
        rl.close();
    }
}

main().catch((error) => {
    console.error('Error:', error);
    process.exit(1);
});
