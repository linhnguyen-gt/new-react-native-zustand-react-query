const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const SCRIPT = path.join(__dirname, '..', 'check-env.js');

/**
 * Runs the real gate against a throwaway project directory.
 *
 * `run-native.cjs` invokes this before every build, so what it accepts is what ships.
 * The previous implementation tested `envContent.includes('API_URL=')`, which is
 * satisfied by a commented-out line, by an empty value, and by any longer key ending in
 * the same name — so it reported a valid configuration for files that had none.
 *
 * @returns the exit code and combined output
 */
const runGate = (envContents, variant = 'development', fileName = '.env') => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'check-env-'));

    try {
        fs.writeFileSync(path.join(dir, fileName), envContents);

        execFileSync('node', [SCRIPT], {
            cwd: dir,
            env: { ...process.env, APP_VARIANT: variant, ENVFILE: fileName },
            stdio: 'pipe',
        });

        return { code: 0, output: '' };
    } catch (error) {
        return { code: error.status ?? 1, output: String(error.stderr ?? '') + String(error.stdout ?? '') };
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
};

const COMPLETE_ENV = [
    'APP_NAME=Example',
    'VERSION_CODE=1',
    'VERSION_NAME=1.0.0',
    'API_URL=https://api.example.com',
].join('\n');

describe('check-env gate', () => {
    it('accepts a complete configuration', () => {
        expect(runGate(COMPLETE_ENV).code).toBe(0);
    });

    /**
     * These assert the *missing-variable* message specifically, not merely a non-zero
     * exit. The scheme check downstream also rejects an absent API_URL, so asserting
     * only the exit code let the old substring implementation pass this suite — the
     * presence check was broken and a later check happened to catch the same input.
     * Verified by reverting to `envContent.includes(...)`: these fail, as they should.
     */
    const MISSING_MESSAGE = /Missing or empty required/;

    it('rejects a commented-out variable', () => {
        const env = COMPLETE_ENV.replace('API_URL=https://api.example.com', '# API_URL=https://api.example.com');

        const result = runGate(env);

        expect(result.code).toBe(1);
        expect(result.output).toMatch(MISSING_MESSAGE);
    });

    it('rejects a commented-out variable that no later check would catch', () => {
        // APP_NAME has no scheme validation behind it, so nothing else can mask a broken
        // presence check. This is the case that isolates the fix.
        const env = COMPLETE_ENV.replace('APP_NAME=Example', '# APP_NAME=Example');

        const result = runGate(env);

        expect(result.code).toBe(1);
        expect(result.output).toMatch(/APP_NAME/);
    });

    it('rejects an empty value', () => {
        const env = COMPLETE_ENV.replace('API_URL=https://api.example.com', 'API_URL=');

        expect(runGate(env).output).toMatch(MISSING_MESSAGE);
    });

    it('is not satisfied by a different key that merely ends with the same name', () => {
        const env = COMPLETE_ENV.replace('API_URL=https://api.example.com', 'LEGACY_API_URL=https://old.example.com');

        // The substring check passed here: "LEGACY_API_URL=" contains "API_URL=".
        const result = runGate(env);

        expect(result.code).toBe(1);
        expect(result.output).toMatch(MISSING_MESSAGE);
    });

    it('rejects cleartext for production', () => {
        const env = COMPLETE_ENV.replace('https://api.example.com', 'http://api.example.com');

        const result = runGate(env, 'production', '.env.production');

        expect(result.code).toBe(1);
        expect(result.output).toMatch(/https/);
    });

    it('allows cleartext for development', () => {
        const env = COMPLETE_ENV.replace('https://api.example.com', 'http://localhost:3000');

        expect(runGate(env, 'development').code).toBe(0);
    });

    it('rejects a value with no scheme', () => {
        const env = COMPLETE_ENV.replace('https://api.example.com', 'api.example.com');

        expect(runGate(env).code).toBe(1);
    });

    it('ignores an inline comment rather than reading it as part of the URL', () => {
        const env = COMPLETE_ENV.replace(
            'API_URL=https://api.example.com',
            'API_URL=https://api.example.com # the staging host'
        );

        // Shares the parser with app.config.ts and push-update.cjs, so all three read a
        // file the same way. Keeping the comment would have made this fail the scheme
        // check for a value that is actually fine.
        expect(runGate(env).code).toBe(0);
    });
});
