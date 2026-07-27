/**
 * One env parser for every build script.
 *
 * `app.config.ts` reads env files through dotenv, which strips inline comments. The
 * build scripts each hand-rolled their own parser and kept everything after the first
 * `=` verbatim, so the same file produced different values depending on who read it.
 *
 * The concrete failure: `.env.example` shipped
 *     EXPO_UPDATE_CHANNEL=development # (development|staging|production)
 * and `push-update.cjs` passed EAS `--channel="development # (development|staging|
 * production)"`, publishing the update to a channel no installed binary subscribes to.
 * The publish succeeds, so nothing surfaces until users report not receiving updates.
 *
 * Comment handling follows dotenv: an unquoted `#` preceded by whitespace begins a
 * comment; a `#` inside quotes is part of the value.
 */

const fs = require('fs');

const QUOTED = /^(['"])([\s\S]*)\1$/;

/** Parse env-file text. Returns a plain object; malformed lines are skipped. */
function parseEnv(contents) {
    const env = {};

    for (const line of contents.split(/\r?\n/)) {
        const trimmed = line.trim();

        if (!trimmed || trimmed.startsWith('#')) {
            continue;
        }

        const separatorIndex = trimmed.indexOf('=');
        // `<= 0` also rejects a leading `=`, which has no key.
        if (separatorIndex <= 0) {
            continue;
        }

        const key = trimmed.slice(0, separatorIndex).trim();
        const rawValue = trimmed.slice(separatorIndex + 1).trim();

        const quoted = rawValue.match(QUOTED);
        env[key] = quoted ? quoted[2] : rawValue.replace(/\s+#.*$/, '').trim();
    }

    return env;
}

/** Parse an env file by path. A missing or unreadable file yields `{}`. */
function parseEnvFile(filePath) {
    try {
        return parseEnv(fs.readFileSync(filePath, 'utf8'));
    } catch {
        return {};
    }
}

module.exports = { parseEnv, parseEnvFile };
