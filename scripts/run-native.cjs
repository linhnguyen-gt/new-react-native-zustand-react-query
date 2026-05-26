#!/usr/bin/env node

const { spawnSync } = require('child_process');

const [, , platform, variantArg] = process.argv;

const variants = {
    development: {
        androidAppId: 'com.newreactnativezustandrnq.dev',
        androidVariant: 'developmentDebug',
        iosConfiguration: 'Debug',
        iosScheme: 'NewReactNativeZustandRNQ',
    },
    staging: {
        androidAppId: 'com.newreactnativezustandrnq.stg',
        androidVariant: 'stagingDebug',
        iosConfiguration: 'Staging.Debug',
        iosScheme: 'Staging',
    },
    production: {
        androidAppId: 'com.newreactnativezustandrnq',
        androidVariant: 'productionDebug',
        iosConfiguration: 'Production.Debug',
        iosScheme: 'Production',
    },
};

const variant = variantArg || 'development';

const run = (command, args, options = {}) => {
    const result = spawnSync(command, args, {
        env: {
            ...process.env,
            APP_VARIANT: variant,
        },
        stdio: 'inherit',
        ...options,
    });

    if (result.error) {
        console.error(result.error.message);
        process.exit(1);
    }

    if (result.status !== 0) {
        process.exit(result.status ?? 1);
    }
};

if (platform !== 'android' && platform !== 'ios') {
    console.error('Usage: node scripts/run-native.cjs <android|ios> [development|staging|production]');
    process.exit(1);
}

if (!variants[variant]) {
    console.error(`Unsupported APP_VARIANT: ${variant}`);
    console.error(`Use one of: ${Object.keys(variants).join(', ')}`);
    process.exit(1);
}

const config = variants[variant];

run(process.execPath, ['scripts/check-env.js']);
run(process.execPath, ['scripts/sync-native-env.cjs']);

if (platform === 'android') {
    run('expo', ['run:android', '--variant', config.androidVariant, '--app-id', config.androidAppId, '--device']);
} else {
    run('expo', ['run:ios', '--scheme', config.iosScheme, '--configuration', config.iosConfiguration, '--device']);
}
