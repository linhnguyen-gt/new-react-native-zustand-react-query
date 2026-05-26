#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

console.log('🔍 Checking environment configuration...');

const VARIANT_ENV_FILES = {
    development: '.env',
    staging: '.env.staging',
    production: '.env.production',
};

const requestedVariant = process.env.APP_VARIANT || 'development';
if (!Object.hasOwn(VARIANT_ENV_FILES, requestedVariant)) {
    console.error(`❌ Unsupported APP_VARIANT: ${requestedVariant}`);
    console.error('Use one of: development, staging, production.');
    process.exit(1);
}

const envFile = process.env.ENVFILE || VARIANT_ENV_FILES[requestedVariant];
const envPath = path.join(process.cwd(), envFile);
if (!fs.existsSync(envPath)) {
    console.error(`❌ ${envFile} file not found!`);
    console.error('Please run "pnpm env:setup" to create environment configuration.');
    process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8').trim();
if (!envContent) {
    console.error(`❌ ${envFile} file is empty!`);
    console.error('Please run "pnpm env:setup" to configure environment variables.');
    process.exit(1);
}

const requiredVars = ['APP_NAME', 'VERSION_CODE', 'VERSION_NAME', 'API_URL'];

const missingVars = [];
for (const varName of requiredVars) {
    if (!envContent.includes(`${varName}=`)) {
        missingVars.push(varName);
    }
}

if (missingVars.length > 0) {
    console.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
    console.error('Please run "pnpm env:setup" to configure all required variables.');
    process.exit(1);
}

console.log('✅ Environment configuration is valid!');
console.log(`📄 Using ${envFile}`);
console.log(`🏷️ Variant ${requestedVariant}`);
console.log('🚀 Proceeding with build...');
