#!/usr/bin/env node

const { spawnSync } = require('child_process');

const [, , appVariant, ...nodeArgs] = process.argv;

if (!appVariant) {
    console.error('Usage: node-with-app-variant.cjs <app-variant> [...node-args]');
    process.exit(1);
}

const result = spawnSync(process.execPath, nodeArgs, {
    cwd: process.cwd(),
    env: {
        ...process.env,
        APP_FLAVOR: appVariant,
        APP_VARIANT: appVariant,
    },
    encoding: 'utf8',
});

if (result.stdout) {
    process.stdout.write(result.stdout);
}

if (result.stderr) {
    process.stderr.write(result.stderr);
}

if (result.error) {
    console.error(result.error.message);
    process.exit(1);
}

process.exit(result.status ?? 0);
