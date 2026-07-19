#!/usr/bin/env node

const { spawnSync } = require('child_process');

const [, , platform, variantArg] = process.argv;

// The variant table lives in one place now. `androidAppId` in particular used to be
// restated here, so changing the package name in app.config.ts left this passing the
// old id to `--app-id` — the build installs one package and the launcher asks for
// another, failing with an error that points at the device rather than the config.
const { VARIANTS: variants, getAndroidAppId, DEFAULT_VARIANT } = require('./lib/variant-config.cjs');

const variant = variantArg || DEFAULT_VARIANT;

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
    run('expo', ['run:android', '--variant', config.androidVariant, '--app-id', getAndroidAppId(variant), '--device']);
} else {
    run('expo', ['run:ios', '--scheme', config.iosScheme, '--configuration', config.iosConfiguration, '--device']);
}
