/**
 * Env precedence for a variant build.
 *
 * These pin a failure that the other 397 tests could not see, because it was invisible in
 * native output: the config plugin reads each variant's file directly, so Gradle flavors,
 * schemes and app labels were all correct while `extra.*` — the half the running app reads
 * — carried development's values into a staging build.
 *
 * The order under test:  shell / eas env:exec  >  .env.<variant>  >  @expo/env's files.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const { loadVariantEnv } = require('../load-variant-env.cjs');

describe('loadVariantEnv', () => {
    let projectRoot;

    beforeEach(() => {
        projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'variant-env-'));
    });

    afterEach(() => {
        fs.rmSync(projectRoot, { recursive: true, force: true });
    });

    const write = (file, contents) => fs.writeFileSync(path.join(projectRoot, file), contents);

    const load = (envFile, env, nodeEnv) => {
        loadVariantEnv({ envFile, projectRoot, env, nodeEnv });
        return env;
    };

    it('fills in variables that are not set at all', () => {
        write('.env.staging', 'API_URL=https://staging.example.com\n');

        expect(load('.env.staging', {}).API_URL).toBe('https://staging.example.com');
    });

    it('overrides values @expo/env loaded from .env', () => {
        // The regression. @expo/env loads `.env` before this runs and knows nothing about
        // APP_VARIANT, so without this the staging build keeps every development value.
        write('.env', 'APP_NAME=NewDev\nAPI_URL=http://localhost:3000\n');
        write('.env.staging', 'APP_NAME=NewStaging\nAPI_URL=https://staging.example.com\n');

        const env = load('.env.staging', { APP_NAME: 'NewDev', API_URL: 'http://localhost:3000' });

        expect(env.APP_NAME).toBe('NewStaging');
        expect(env.API_URL).toBe('https://staging.example.com');
    });

    it('overrides values @expo/env loaded from .env.<NODE_ENV>', () => {
        // NODE_ENV=production is normal for a release build of *any* variant, so Expo
        // loads `.env.production` even when staging was asked for.
        write('.env.production', 'APP_NAME=NewProduct\n');
        write('.env.staging', 'APP_NAME=NewStaging\n');

        expect(load('.env.staging', { APP_NAME: 'NewProduct' }, 'production').APP_NAME).toBe('NewStaging');
    });

    it('lets the shell and eas env:exec win', () => {
        write('.env', 'APP_NAME=NewDev\n');
        write('.env.staging', 'APP_NAME=NewStaging\n');

        // A value matching no env file can only have come from the shell.
        expect(load('.env.staging', { APP_NAME: 'InjectedByEasEnvExec' }).APP_NAME).toBe('InjectedByEasEnvExec');
    });

    it('does not treat the variant file as a source it may override', () => {
        // `.env` IS the variant file for development, so nothing about it is overridable
        // and a shell value must survive.
        write('.env', 'APP_NAME=NewDev\n');

        expect(load('.env', { APP_NAME: 'NewDev' }).APP_NAME).toBe('NewDev');
        expect(load('.env', { APP_NAME: 'FromShell' }).APP_NAME).toBe('FromShell');
    });

    it('leaves unrelated variables alone', () => {
        write('.env.staging', 'API_URL=https://staging.example.com\n');

        expect(load('.env.staging', { PATH: '/usr/bin', HOME: '/home/x' })).toMatchObject({
            PATH: '/usr/bin',
            HOME: '/home/x',
        });
    });

    it('is a no-op when the variant file is missing', () => {
        expect(load('.env.staging', { APP_NAME: 'NewDev' }).APP_NAME).toBe('NewDev');
    });
});
