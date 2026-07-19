#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

// The one parser shared by every build script, so this gate reads a file exactly the
// way app.config.ts and push-update.cjs do.
import { parseEnv } from './lib/parse-env-file.cjs';

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

// Parsed, not substring-matched. The previous check was
// `envContent.includes(`${varName}=`)`, which is satisfied by a commented-out line, by
// an empty value, and by any unrelated key that merely ends with the name — so
// `LEGACY_API_URL=x` alone made API_URL "present". This gate runs before every build,
// so it was reporting a valid configuration for files that had none.
const parsed = parseEnv(envContent);

const missingVars = requiredVars.filter((varName) => !parsed[varName]);

if (missingVars.length > 0) {
    console.error(`❌ Missing or empty required environment variables: ${missingVars.join(', ')}`);
    console.error('Please run "pnpm env:setup" to configure all required variables.');
    process.exit(1);
}

// Mirrors the runtime check in src/shared/config/api-url.ts. Catching it here means a
// misconfigured build fails before the native toolchain runs, rather than at app
// startup on a device.
const apiUrl = parsed.API_URL;

if (!/^https?:\/\//i.test(apiUrl)) {
    console.error(`❌ API_URL must start with http:// or https://, but is "${apiUrl}".`);
    process.exit(1);
}

if (requestedVariant !== 'development' && !/^https:\/\//i.test(apiUrl)) {
    console.error(`❌ API_URL must use https:// for the "${requestedVariant}" variant, but is "${apiUrl}".`);
    console.error('Cleartext is allowed only for development.');
    console.error('Note iOS may allow this on a local network while Android blocks it outright,');
    console.error('so a cleartext build can appear to work on one platform and fail on the other.');
    process.exit(1);
}

console.log('✅ Environment configuration is valid!');
console.log(`📄 Using ${envFile}`);
console.log(`🏷️ Variant ${requestedVariant}`);
console.log('🚀 Proceeding with build...');
