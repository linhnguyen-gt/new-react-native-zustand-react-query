#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

console.log('🔍 Checking environment configuration...');

const envPath = path.join(process.cwd(), '.env');
if (!fs.existsSync(envPath)) {
    console.error('❌ .env file not found!');
    console.error('Please run "yarn env:setup" to create environment configuration.');
    process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8').trim();
if (!envContent) {
    console.error('❌ .env file is empty!');
    console.error('Please run "yarn env:setup" to configure environment variables.');
    process.exit(1);
}

const requiredVars = ['APP_FLAVOR', 'APP_NAME', 'VERSION_CODE', 'VERSION_NAME', 'API_URL'];

const missingVars = [];
for (const varName of requiredVars) {
    if (!envContent.includes(`${varName}=`)) {
        missingVars.push(varName);
    }
}

if (missingVars.length > 0) {
    console.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
    console.error('Please run "yarn env:setup" to configure all required variables.');
    process.exit(1);
}

console.log('✅ Environment configuration is valid!');
console.log('🚀 Proceeding with build...');
