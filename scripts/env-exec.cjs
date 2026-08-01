#!/usr/bin/env node

/**
 * Run a command with a variant's EAS environment injected, no env file involved.
 *
 *   pnpm env:exec staging -- pnpm ios:stg
 *   pnpm env:exec production -- pnpm exec expo export --platform android
 *
 * This is the route that makes EAS the source of truth rather than a place files are
 * copied from. `eas env:exec` populates `process.env` before the command starts, and
 * `app.config.ts` loads its env file *without overwriting* anything already defined — so
 * the EAS values win and the local file cannot silently override them with stale data.
 *
 * Only non-secret variables are injected: EAS refuses to read `secret`-visibility values
 * outside its own servers, and `app.config.ts` needs every value it reads during config
 * resolution. Keep the variables this project uses at `plaintext` or `sensitive`.
 */

const { spawnSync } = require('child_process');

const { VARIANT_EAS_ENVIRONMENTS } = require('./lib/variant-config.cjs');

const args = process.argv.slice(2);
const separator = args.indexOf('--');

const variant = args[0];
const command = separator === -1 ? args.slice(1) : args.slice(separator + 1);

if (!variant || command.length === 0) {
    console.error('Usage: node scripts/env-exec.cjs <development|staging|production> -- <command...>');
    process.exit(1);
}

const environment = VARIANT_EAS_ENVIRONMENTS[variant];

if (!environment) {
    console.error(`Unsupported variant: ${variant}`);
    console.error(`Use one of: ${Object.keys(VARIANT_EAS_ENVIRONMENTS).join(', ')}`);
    process.exit(1);
}

/**
 * `eas env:exec` takes the command as ONE bash string, not as argv after `--`, so the
 * pieces have to be re-quoted before they are joined. Without this, `pnpm env:exec
 * production -- node -e "console.log(1)"` reaches bash as several bare words and the
 * shell re-splits them, running something other than what was asked.
 */
const shellQuote = (arg) => (/^[\w@%+=:,./-]+$/.test(arg) ? arg : `'${arg.replace(/'/g, `'\\''`)}'`);

// `APP_VARIANT` is set here rather than expected from the EAS environment. It selects the
// Gradle flavor, the Xcode scheme and the env file, and it is a property of *which build
// you asked for* — not a value that should be editable in a dashboard where changing it
// would silently retarget everyone's builds.
const result = spawnSync(
    'pnpm',
    ['dlx', 'eas-cli', 'env:exec', environment, command.map(shellQuote).join(' '), '--non-interactive'],
    { stdio: 'inherit', env: { ...process.env, APP_VARIANT: variant } }
);

if (result.error) {
    console.error(result.error.message);
    process.exit(1);
}

process.exit(result.status ?? 0);
