import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { createInterface } from 'readline';

const readline = createInterface({
    input: process.stdin,
    output: process.stdout,
});

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

const ENVIRONMENTS = [
    { key: 'development', displayName: 'development' },
    { key: 'staging', displayName: 'staging' },
    { key: 'production', displayName: 'production' },
];

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

const VAULT_BACKUP_PATH = '.env.vault.bak';

/** Restores the pre-replacement .env.vault if a backup is present. */
const restoreVaultBackup = () => {
    if (!fs.existsSync(VAULT_BACKUP_PATH)) return;

    try {
        fs.copyFileSync(VAULT_BACKUP_PATH, '.env.vault');
        fs.rmSync(VAULT_BACKUP_PATH, { force: true });
    } catch (error) {
        console.error(`Failed to restore .env.vault from ${VAULT_BACKUP_PATH}:`, error.message);
        console.error(`Your previous vault key is still at ${VAULT_BACKUP_PATH} — restore it manually.`);
    }
};

/**
 * Parses a dotenv file into a plain object.
 *
 * Splits on the FIRST '=' only. Splitting on every '=' truncates any value that
 * contains one — base64 keys, JWTs and connection strings routinely do — and the
 * truncated value then gets written back over the vault copy.
 *
 * Blank lines and '#' comments are skipped so a commented-out entry is not read
 * back as a variable literally named '# NAME'.
 */
const parseEnvFile = (filePath) => {
    const parsed = {};

    try {
        const envContent = fs.readFileSync(filePath, 'utf8');

        envContent.split('\n').forEach((line) => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) return;

            const separatorIndex = trimmed.indexOf('=');
            if (separatorIndex <= 0) return;

            const key = trimmed.slice(0, separatorIndex).trim();
            const value = trimmed.slice(separatorIndex + 1).trim();
            if (key && value) {
                parsed[key] = value;
            }
        });
    } catch (error) {
        console.error(`Failed to read ${filePath}:`, error.message);
    }

    return parsed;
};

const createEnvFiles = async (environment, vaultKey = null, envVarsFromVault = {}) => {
    let envVars = { ...envVarsFromVault };
    const envKey = environment.key;
    const envDisplayName = environment.displayName;
    const envFileName = envKey === 'development' ? '.env' : `.env.${envKey}`;

    if (fs.existsSync(envFileName)) {
        try {
            const content = fs.readFileSync(envFileName, 'utf8');
            if (content.trim().length > 0) {
                console.log(`\n📝 ${envFileName} already exists and has content.`);
                const overwrite = await question(`Do you want to overwrite ${envFileName}? (y/n): `);
                if (overwrite.toLowerCase() !== 'y') {
                    console.log(`✅ Keeping existing ${envFileName}`);
                    return envVars;
                }
            }
        } catch {}
    }

    console.log(`\n📝 Setting up ${envDisplayName} environment in ${envFileName}...`);

    let envContent = envKey === 'development' ? '# development\n' : `# ${envKey}\n`;

    envVars.APP_VARIANT = envKey;
    envVars.APP_FLAVOR = envDisplayName;

    if (vaultKey) {
        envVars.DOTENV_VAULT = vaultKey;
    }

    if (!envVars.API_URL || envVars.API_URL.trim() === '') {
        const defaultUrl = {
            development: 'http://localhost:3000',
            staging: 'https://api-staging.example.com',
            production: 'https://api.example.com',
        }[envKey];

        const apiUrl = await question(`Enter API_URL for ${envDisplayName} (default: ${defaultUrl}): `);
        envVars.API_URL = apiUrl || defaultUrl;
    }

    if (!envVars.VERSION_CODE) {
        envVars.VERSION_CODE = '1';
    }
    if (!envVars.VERSION_NAME) {
        envVars.VERSION_NAME = '1.0.0';
    }

    if (!envVars.APP_NAME) {
        const baseAppName = getPackageName();
        const defaultAppName = baseAppName + ' ' + envDisplayName;
        const appName = await question(`Enter APP_NAME for ${envDisplayName} (default: ${defaultAppName}): `);
        envVars.APP_NAME = appName || defaultAppName;
    }

    // Expo Updates configuration
    console.log('\n📦 Expo Updates Configuration:');
    console.log('   Get your project ID from https://expo.dev/projects');

    if (!envVars.EXPO_PROJECT_ID) {
        const defaultProjectId = envKey === 'development' ? '' : envVarsFromVault.EXPO_PROJECT_ID || '';
        const projectId = await question(
            `Enter EXPO_PROJECT_ID for ${envDisplayName}${defaultProjectId ? ` (default: ${defaultProjectId})` : ''}: `
        );
        envVars.EXPO_PROJECT_ID = projectId || defaultProjectId;
    }

    if (!envVars.EXPO_UPDATE_URL && envVars.EXPO_PROJECT_ID) {
        const defaultUpdateUrl = `https://u.expo.dev/${envVars.EXPO_PROJECT_ID}`;
        const updateUrl = await question(
            `Enter EXPO_UPDATE_URL for ${envDisplayName} (default: ${defaultUpdateUrl}): `
        );
        envVars.EXPO_UPDATE_URL = updateUrl || defaultUpdateUrl;
    }

    if (!envVars.EXPO_UPDATE_CHANNEL) {
        const defaultChannel = envKey === 'development' ? 'development' : envKey;
        const channel = await question(
            `Enter EXPO_UPDATE_CHANNEL for ${envDisplayName} (default: ${defaultChannel}): `
        );
        envVars.EXPO_UPDATE_CHANNEL = channel || defaultChannel;
    }

    // Key names only. Printing values leaks every secret pulled from the vault into
    // whatever captures stdout -- CI logs, tmux scrollback, a screen share.
    console.log('\nCurrent environment variables:');
    Object.keys(envVars)
        .filter((key) => key !== 'DOTENV_VAULT')
        .forEach((key) => {
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
        .filter(([key]) => key !== 'DOTENV_VAULT')
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

    try {
        fs.writeFileSync(envFileName, envContent);
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
!.env.vault
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

const createEnvExample = (envVars) => {
    const exampleContent = `# This is an example environment file
# Copy this file to .env, .env.staging, or .env.production and update the values

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

# Add your other environment variables below
GOOGLE_API_KEY=
FACEBOOK_APP_ID=
SOME_OTHER_VAR=

${Object.keys(envVars)
    .filter(
        (key) =>
            ![
                'APP_VARIANT',
                'APP_FLAVOR',
                'VERSION_CODE',
                'VERSION_NAME',
                'API_URL',
                'APP_NAME',
                'DOTENV_VAULT',
                'EXPO_PROJECT_ID',
                'EXPO_UPDATE_URL',
                'EXPO_UPDATE_CHANNEL',
            ].includes(key)
    )
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

    let vaultKey = null;
    let useVault = false;
    let isNewVault = false;
    let envVarsFromVault = {};

    console.log('\n📋 Environment Setup Options:');
    console.log('- DOTENV_VAULT is a secure way to manage environment variables across environments');
    console.log('- It allows you to share encrypted environment variables with your team');
    console.log('- Learn more at: https://www.dotenv.org/vault');

    // Recover from an interrupted vault replacement before anything else. If the
    // previous run was killed between removing .env.vault and creating its
    // replacement (the `dotenv-vault new` prompt is interactive, so Ctrl-C there is
    // common), the only surviving copy of the key is the backup. Without this,
    // the existsSync check below is false, the whole switch is skipped, and the
    // script cheerfully creates a fresh vault while the team's key sits orphaned.
    if (fs.existsSync(VAULT_BACKUP_PATH) && !fs.existsSync('.env.vault')) {
        console.log(`\n⚠️ Found ${VAULT_BACKUP_PATH} from an interrupted run and no .env.vault.`);
        restoreVaultBackup();
        if (fs.existsSync('.env.vault')) {
            console.log('✅ Restored .env.vault from the backup.');
        }
    }

    if (fs.existsSync('.env.vault')) {
        const vaultOptions = await question(
            '\n⚠️ Found existing .env.vault file. What would you like to do?\n' +
                '1. Use existing vault (may fail if key is invalid)\n' +
                '2. Create a new vault\n' +
                '3. Enter a different vault key\n' +
                '4. Skip vault and continue with manual setup\n' +
                'Enter option (1-4): '
        );

        switch (vaultOptions.trim()) {
            case '1':
                try {
                    const vaultContent = fs.readFileSync('.env.vault', 'utf8');
                    const match = vaultContent.match(/DOTENV_VAULT=(.*)/);
                    if (match && match[1]) {
                        vaultKey = match[1].trim();
                        useVault = true;
                        console.log('✅ Using existing .env.vault file');

                        console.log('\n📥 Pulling from vault...');
                        if (!runCommand('npx dotenv-vault@latest pull')) {
                            console.log('\n⚠️ Failed to pull from vault. The vault key may be invalid.');
                            const continueOption = await question(
                                'Would you like to continue with manual setup? (y/n): '
                            );
                            if (continueOption.toLowerCase() !== 'y') {
                                console.log('Setup aborted. Please run the script again with a valid vault key.');
                                process.exit(1);
                            }
                            useVault = false;
                        } else {
                            if (fs.existsSync('.env')) {
                                Object.assign(envVarsFromVault, parseEnvFile('.env'));
                            }
                        }
                    }
                } catch (error) {
                    console.error('Failed to read .env.vault file:', error);
                    useVault = false;
                }
                break;

            case '2':
                // .env.vault is the only committed link to every stored environment.
                // Back it up before removing it and restore on any failure — the
                // previous flow deleted it first and continued past a failed
                // replacement with only a warning, losing the key permanently.
                fs.copyFileSync('.env.vault', VAULT_BACKUP_PATH);
                fs.unlinkSync('.env.vault');
                console.log('✅ Removed existing .env.vault file (backup retained)');

                try {
                    console.log('\n📦 Creating new dotenv-vault...');
                    const created =
                        runCommand('npx dotenv-vault@latest new') &&
                        fs.existsSync('.env.vault') &&
                        fs.readFileSync('.env.vault', 'utf8').trim().length > 0;

                    if (!created) {
                        restoreVaultBackup();
                        console.error('\n❌ Failed to create a new vault. The previous .env.vault has been restored.');
                        process.exit(1);
                    }

                    fs.rmSync(VAULT_BACKUP_PATH, { force: true });
                    isNewVault = true;
                    useVault = true;
                } catch (error) {
                    restoreVaultBackup();
                    console.error('Failed to create new vault:', error.message);
                    console.error('The previous .env.vault has been restored.');
                    process.exit(1);
                }
                break;

            case '3':
                const newVaultKey = await question('Enter your DOTENV_VAULT key: ');
                if (newVaultKey.startsWith('vlt_')) {
                    vaultKey = newVaultKey.trim();
                    useVault = true;

                    const vaultContent = `DOTENV_VAULT=${vaultKey}`;
                    fs.writeFileSync('.env.vault', vaultContent);
                    console.log('✅ Updated .env.vault with new key');

                    console.log('\n📥 Pulling from vault...');
                    if (!runCommand('npx dotenv-vault@latest pull')) {
                        console.log('\n⚠️ Failed to pull from vault. The vault key may be invalid.');
                        const continueOption = await question('Would you like to continue with manual setup? (y/n): ');
                        if (continueOption.toLowerCase() !== 'y') {
                            console.log('Setup aborted. Please run the script again with a valid vault key.');
                            process.exit(1);
                        }
                        useVault = false;
                    } else {
                        if (fs.existsSync('.env')) {
                            Object.assign(envVarsFromVault, parseEnvFile('.env'));
                        }
                    }
                } else {
                    console.log('⚠️ Invalid vault key format. Continuing with manual setup.');
                    useVault = false;
                }
                break;

            case '4':
            default:
                console.log('✅ Skipping vault setup');
                useVault = false;
                break;
        }
    } else {
        const vaultResponse = await question(
            '\nWould you like to use DOTENV_VAULT for secure environment variable management?\n' +
                "Enter 'y' to create a new vault, 'n' to skip, or paste your existing DOTENV_VAULT key: "
        );

        if (vaultResponse.startsWith('vlt_')) {
            vaultKey = vaultResponse.trim();
            useVault = true;
            console.log('✅ Using provided DOTENV_VAULT key');

            const vaultContent = `DOTENV_VAULT=${vaultKey}`;
            fs.writeFileSync('.env.vault', vaultContent);

            console.log('\n📥 Pulling from vault...');
            if (!runCommand('npx dotenv-vault@latest pull')) {
                console.log('⚠️ Failed to pull from vault. Will continue with manual setup.');
                useVault = false;
            } else {
                console.log('✅ Successfully pulled environment variables from vault');
                if (fs.existsSync('.env')) {
                    Object.assign(envVarsFromVault, parseEnvFile('.env'));
                    console.log(`✅ Loaded ${Object.keys(envVarsFromVault).length} variables from vault`);
                }

                if (!fs.existsSync('.env.staging')) {
                    console.log('\n📥 Pulling staging environment from vault...');
                    try {
                        execSync('npx dotenv-vault@latest pull staging', { stdio: 'pipe' });
                        console.log('✅ Pulled staging environment from vault');
                    } catch (error) {
                        const output = `${error?.stdout || ''}${error?.stderr || ''}${error?.message || ''}`;
                        if (
                            output.includes('NOT_FOUND_ENVIRONMENT') ||
                            output.includes("Environment 'staging' not found")
                        ) {
                            console.log(
                                '⚠️ Staging environment not found in vault. Skipping pull and continuing with manual setup.'
                            );
                        } else {
                            console.log('⚠️ Failed to pull staging from vault. Continuing without staging.');
                        }
                    }
                }

                if (!fs.existsSync('.env.production')) {
                    console.log('\n📥 Pulling production environment from vault...');
                    try {
                        execSync('npx dotenv-vault@latest pull production', { stdio: 'pipe' });
                        console.log('✅ Pulled production environment from vault');
                    } catch (error) {
                        const output = `${error?.stdout || ''}${error?.stderr || ''}${error?.message || ''}`;
                        if (
                            output.includes('NOT_FOUND_ENVIRONMENT') ||
                            output.includes("Environment 'production' not found")
                        ) {
                            console.log(
                                '⚠️ Production environment not found in vault. Skipping pull and continuing with manual setup.'
                            );
                        } else {
                            console.log('⚠️ Failed to pull production from vault. Continuing without production.');
                        }
                    }
                }
            }
        } else if (vaultResponse.toLowerCase() === 'y') {
            useVault = true;
            try {
                console.log('\n📦 Creating new dotenv-vault...');
                if (!runCommand('npx dotenv-vault@latest new')) {
                    process.exit(1);
                }
                isNewVault = true;
            } catch (error) {
                console.error('Failed to create new vault:', error);
                process.exit(1);
            }
        } else {
            console.log('✅ Skipping DOTENV_VAULT setup');
            useVault = false;
        }
    }

    console.log('\n📝 Creating environment files...');
    const envVarsResults = {};
    for (const env of ENVIRONMENTS) {
        const envVars = await createEnvFiles(env, vaultKey, envVarsFromVault);
        if (!envVars) {
            process.exit(1);
        }
        envVarsResults[env.key] = envVars;
    }

    if (isNewVault) {
        console.log('\n🔑 Logging in to dotenv-vault...');
        if (!runCommand('npx dotenv-vault@latest login')) {
            process.exit(1);
        }

        console.log('\n⬆️ Pushing environments to vault...');

        console.log('\n📤 Pushing development environment...');
        if (!runCommand('npx dotenv-vault@latest push')) {
            process.exit(1);
        }

        console.log('\n📤 Pushing staging environment...');
        if (!runCommand('npx dotenv-vault@latest push staging')) {
            process.exit(1);
        }

        console.log('\n📤 Pushing production environment...');
        if (!runCommand('npx dotenv-vault@latest push production')) {
            process.exit(1);
        }
    }

    if (!updateGitignore()) {
        process.exit(1);
    }

    if (!createEnvExample(envVarsResults.development || {})) {
        process.exit(1);
    }

    console.log('\n✨ Environment setup completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Review your environment files:');
    ENVIRONMENTS.forEach((env) => {
        const fileName = env.key === 'development' ? '.env' : `.env.${env.key}`;
        console.log(`   - ${fileName} (${env.displayName})`);
    });
    if (useVault) {
        console.log('2. Commit the .env.vault file');
        console.log('3. Share the .env.vault credentials with your team');
    }

    readline.close();
};

main().catch((error) => {
    console.error(error);
    readline.close();
    process.exit(1);
});
