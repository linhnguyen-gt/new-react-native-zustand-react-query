/**
 * Loads a variant's env file into `process.env` with the precedence the build depends on:
 *
 *     eas env:exec / shell  >  .env.<variant>  >  whatever @expo/env already loaded
 *
 * Two loaders run, and only one of them knows about variants. `@expo/env` runs first,
 * unconditionally, and keys off `NODE_ENV` — it has no idea `APP_VARIANT` exists. So by
 * the time `app.config.ts` is evaluated, `process.env` may already hold a *different*
 * variant's values.
 *
 * This is why "skip anything already defined" is not enough on its own. It was the first
 * implementation here, replacing `dotenv.config({ override: true })`, and it inverted the
 * shell-vs-file precedence correctly while quietly breaking variant selection: building
 * staging with a `.env` present left every development value in place, and
 * `expo config` for staging reported `appDisplayName: 'NewDev'`.
 *
 * That failure is close to invisible. The config plugin reads each variant's file itself,
 * so Gradle flavors, schemes and app labels all stayed correct — only `extra.*` was wrong,
 * which is the half the running app reads. A staging build talking to the development API
 * with the right name on the launcher icon.
 *
 * The fix: a value is overridable when it equals what one of the files `@expo/env` could
 * have loaded holds. Anything else came from the shell or from `eas env:exec` and wins.
 *
 * Residual case: a shell variable set to exactly the value one of those files holds is
 * indistinguishable from the file's own, so the variant file overrides it. Reaching it
 * means exporting development's value and then building staging, and the result is the
 * value the variant file asked for.
 */

const path = require('path');

const { parseEnvFile } = require('./parse-env-file.cjs');

/**
 * Files `@expo/env` may have loaded, in its own precedence order (first wins).
 * Mirrors `@expo/env`'s `getFiles`.
 */
function expoEnvFiles(nodeEnv) {
    return [nodeEnv && `.env.${nodeEnv}.local`, '.env.local', nodeEnv && `.env.${nodeEnv}`, '.env'].filter(Boolean);
}

/**
 * @param {object} options
 * @param {string} options.envFile        The variant's env file, relative to projectRoot.
 * @param {string} [options.projectRoot]  Defaults to `process.cwd()`.
 * @param {NodeJS.ProcessEnv} [options.env] The environment to read and mutate.
 * @param {string} [options.nodeEnv]      Defaults to `env.NODE_ENV`.
 */
function loadVariantEnv({ envFile, projectRoot = process.cwd(), env = process.env, nodeEnv } = {}) {
    const resolvedNodeEnv = nodeEnv === undefined ? env.NODE_ENV : nodeEnv;

    // Later files are lower precedence for @expo/env, so merging in reverse leaves the
    // higher-precedence value in place — the one actually sitting in `env` right now.
    const overridable = {};
    for (const file of expoEnvFiles(resolvedNodeEnv).filter((file) => file !== envFile).reverse()) {
        Object.assign(overridable, parseEnvFile(path.join(projectRoot, file)));
    }

    for (const [key, value] of Object.entries(parseEnvFile(path.join(projectRoot, envFile)))) {
        if (env[key] === undefined || env[key] === overridable[key]) {
            env[key] = value;
        }
    }
}

module.exports = { loadVariantEnv, internal: { expoEnvFiles } };
