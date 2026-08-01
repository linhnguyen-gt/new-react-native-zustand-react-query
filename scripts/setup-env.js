/**
 * First-run environment setup.
 *
 * EAS is the source of truth for environment variables; the `.env` files this script
 * writes are local copies for working offline and for the build scripts that read files
 * (`check-env.js`, `sync-native-env.cjs`, the config plugin). Nothing here encrypts or
 * stores anything — pulling from EAS is one option, filling the files by hand is the
 * other, and both end at the same three files.
 *
 * This replaced a dotenv-vault wizard. That flow shelled out to `npx dotenv-vault@latest`
 * for a service the project no longer uses, and it wrote a `DOTENV_VAULT` key into every
 * env file.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { createInterface } from 'readline';
import { fileURLToPath } from 'url';

import { VARIANT_EAS_ENVIRONMENTS, VARIANT_ENV_FILES } from './lib/variant-config.cjs';
import { parseEnvFile } from './lib/parse-env-file.cjs';

const readline = createInterface({
    input: process.stdin,
    output: process.stdout,
});

const SCRIPTS_DIR = path.dirname(fileURLToPath(import.meta.url));

const getPackageName = () => {
    try {
        const packageJsonPath = path.join(process.cwd(), 'package.json');
        if (fs.existsSync(packageJsonPath)) {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            return packageJson.name || 'MyApp';
        }
    } catch (error) {
        console.warn('Failed to read package.json:', error);
    }
    return 'MyApp';
};

const ENVIRONMENTS = Object.keys(VARIANT_EAS_ENVIRONMENTS).map((key) => ({
    key,
    displayName: key,
    file: VARIANT_ENV_FILES[key],
    easEnvironment: VARIANT_EAS_ENVIRONMENTS[key],
}));

const runCommand = (command) => {
    try {
        execSync(command, { stdio: 'inherit' });
        return true;
    } catch {
        console.error(`Failed to execute ${command}`);
        return false;
    }
};

const question = (query) => new Promise((resolve) => readline.question(query, resolve));

const runEnvSync = (direction) => runCommand(`node "${path.join(SCRIPTS_DIR, 'env-sync.cjs')}" ${direction}`);

const createEnvFiles = async (environment) => {
    const envKey = environment.key;
    const envDisplayName = environment.displayName;
    const envFileName = environment.file;

    if (fs.existsSync(envFileName)) {
        try {
            const content = fs.readFileSync(envFileName, 'utf8');
            if (content.trim().length > 0) {
                console.log(`\n📝 ${envFileName} already exists and has content.`);
                const overwrite = await question(`Do you want to overwrite ${envFileName}? (y/n): `);
                if (overwrite.toLowerCase() !== 'y') {
                    console.log(`✅ Keeping existing ${envFileName}`);
                    return parseEnvFile(envFileName);
                }
            }
        } catch {}
    }

    console.log(`\n📝 Setting up ${envDisplayName} environment in ${envFileName}...`);

    let envContent = `# ${envKey}\n`;
    const envVars = {};

    envVars.APP_VARIANT = envKey;
    envVars.APP_FLAVOR = envDisplayName;

    const defaultUrl = {
        development: 'http://localhost:3000',
        staging: 'https://api-staging.example.com',
        production: 'https://api.example.com',
    }[envKey];

    const apiUrl = await question(`Enter API_URL for ${envDisplayName} (default: ${defaultUrl}): `);
    envVars.API_URL = apiUrl || defaultUrl;

    envVars.VERSION_CODE = '1';
    envVars.VERSION_NAME = '1.0.0';

    const baseAppName = getPackageName();
    const defaultAppName = `${baseAppName} ${envDisplayName}`;
    const appName = await question(`Enter APP_NAME for ${envDisplayName} (default: ${defaultAppName}): `);
    envVars.APP_NAME = appName || defaultAppName;

    console.log('\n📦 Expo Updates Configuration:');
    console.log('   Get your project ID from https://expo.dev/projects');

    const projectId = await question(`Enter EXPO_PROJECT_ID for ${envDisplayName}: `);
    envVars.EXPO_PROJECT_ID = projectId;

    if (envVars.EXPO_PROJECT_ID) {
        const defaultUpdateUrl = `https://u.expo.dev/${envVars.EXPO_PROJECT_ID}`;
        const updateUrl = await question(
            `Enter EXPO_UPDATE_URL for ${envDisplayName} (default: ${defaultUpdateUrl}): `
        );
        envVars.EXPO_UPDATE_URL = updateUrl || defaultUpdateUrl;
    }

    const defaultChannel = envKey;
    const channel = await question(`Enter EXPO_UPDATE_CHANNEL for ${envDisplayName} (default: ${defaultChannel}): `);
    envVars.EXPO_UPDATE_CHANNEL = channel || defaultChannel;

    // Key names only. Printing values leaks them into whatever captures stdout -- CI
    // logs, tmux scrollback, a screen share.
    console.log('\nCurrent environment variables:');
    Object.keys(envVars).forEach((key) => {
        console.log(`  ${key}`);
    });

    let addMore = true;
    while (addMore) {
        const answer = await question(
            `\nWould you like to add another environment variable for ${envDisplayName}? (y/n): `
        );
        if (answer.toLowerCase() === 'y') {
            const newVar = await question('Enter variable name: ');
            if (newVar && !(newVar in envVars)) {
                const value = await question(`Enter value for ${newVar}: `);
                envVars[newVar] = value;
                console.log(`✅ Added ${newVar}`);
            }
        } else {
            addMore = false;
        }
    }

    envContent += Object.entries(envVars)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

    try {
        fs.writeFileSync(envFileName, `${envContent}\n`);
        console.log(`\n✅ Created ${envFileName}`);
        return envVars;
    } catch (error) {
        console.error(`Failed to create ${envFileName}:`, error);
        return null;
    }
};

const updateGitignore = () => {
    const gitignoreContent = `
# Environment files
.env
.env.*
!.env.example
`;

    try {
        let currentContent = '';
        if (fs.existsSync('.gitignore')) {
            currentContent = fs.readFileSync('.gitignore', 'utf8');
        }

        if (!currentContent.includes('.env.example')) {
            fs.appendFileSync('.gitignore', gitignoreContent);
            console.log('✅ Updated .gitignore');
        }
        return true;
    } catch (error) {
        console.error('Failed to update .gitignore:', error);
        return false;
    }
};

const KNOWN_KEYS = [
    'APP_VARIANT',
    'APP_FLAVOR',
    'VERSION_CODE',
    'VERSION_NAME',
    'API_URL',
    'APP_NAME',
    'EXPO_PROJECT_ID',
    'EXPO_UPDATE_URL',
    'EXPO_UPDATE_CHANNEL',
];

const createEnvExample = (envVars) => {
    // `.env.example` is committed and hand-maintained: it carries the https-only note for
    // staging/production, the "not a place for secrets" warning, and the EAS commands. It
    // is also what CI copies to `.env` before a build. Regenerating it from one local run
    // would drop all of that, so this only fills in a missing file.
    if (fs.existsSync('.env.example')) {
        console.log('✅ Keeping existing .env.example');
        return true;
    }

    const exampleContent = `# Template only — copy to .env, .env.staging or .env.production and fill in.
#
# NOT A PLACE FOR SECRETS. Every variable app.config.ts reads is copied into the app
# manifest, which ships inside the binary and is readable by anyone who installs the app.
# API keys, signing tokens and anything else that must stay private belong in EAS with
# "secret" visibility, or on a server the app talks to.
#
# The real values live in EAS (expo.dev). Pull them with:
#   pnpm env:pull            # all variants
#   pnpm env:pull staging    # one variant

# Environment
APP_VARIANT=development # (development|staging|production)
APP_FLAVOR=development # legacy alias

# App Configuration
APP_NAME=MyApp

# Version
VERSION_CODE=1
VERSION_NAME=1.0.0

# API Configuration
API_URL=http://localhost:3000

# Expo Updates Configuration
# Get these from your Expo project settings (expo.dev)
EXPO_PROJECT_ID=your-project-id-here
EXPO_UPDATE_URL=https://u.expo.dev/your-project-id-here
EXPO_UPDATE_CHANNEL=development # (development|staging|production)
${Object.keys(envVars)
    .filter((key) => !KNOWN_KEYS.includes(key))
    .map((key) => `${key}=`)
    .join('\n')}
`;

    try {
        fs.writeFileSync('.env.example', exampleContent);
        console.log('✅ Created .env.example file');
        return true;
    } catch (error) {
        console.error('Failed to create .env.example:', error);
        return false;
    }
};

const main = async () => {
    console.log('🚀 Starting environment setup...');

    console.log('\n📋 How this project handles environment variables:');
    console.log('- EAS (expo.dev) holds the real values, one set per environment');
    console.log(`- ${ENVIRONMENTS.map((env) => `${env.key} → EAS "${env.easEnvironment}"`).join(', ')}`);
    console.log('- The local .env files are copies, for working offline and for the build scripts');
    console.log('- Docs: https://docs.expo.dev/eas/environment-variables/');

    const pullAnswer = await question(
        '\nPull the values from EAS now? Requires `eas login`.\n' +
            "Enter 'y' to pull, or 'n' to fill the files in by hand: "
    );

    let pulled = false;
    if (pullAnswer.trim().toLowerCase() === 'y') {
        pulled = runEnvSync('pull');
        if (!pulled) {
            console.log('\n⚠️ Pull failed. Continuing with manual setup — nothing was overwritten.');
        }
    }

    console.log('\n📝 Creating environment files...');
    const envVarsResults = {};
    for (const env of ENVIRONMENTS) {
        const envVars = await createEnvFiles(env);
        if (!envVars) {
            process.exit(1);
        }
        envVarsResults[env.key] = envVars;
    }

    if (!updateGitignore()) {
        process.exit(1);
    }

    if (!createEnvExample(envVarsResults.development || {})) {
        process.exit(1);
    }

    // Only offered when the files were filled in locally. After a successful pull the
    // files already match EAS, and pushing them straight back would overwrite whatever a
    // teammate changed in between with values this run never looked at.
    if (!pulled) {
        const pushAnswer = await question('\nPush these values up to EAS so the team shares them? (y/n): ');
        if (pushAnswer.trim().toLowerCase() === 'y' && !runEnvSync('push')) {
            console.log('⚠️ Push failed. The local files are fine; run `pnpm env:push` again once `eas login` works.');
        }
    }

    console.log('\n✨ Environment setup completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Review your environment files:');
    ENVIRONMENTS.forEach((env) => {
        console.log(`   - ${env.file} (${env.displayName})`);
    });
    console.log('2. Keep them out of git — only .env.example is committed');
    console.log('3. Run a command against EAS values without any file: pnpm env:exec staging -- pnpm ios:stg');

    readline.close();
};

main().catch((error) => {
    console.error(error);
    readline.close();
    process.exit(1);
});
