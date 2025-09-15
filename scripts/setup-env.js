const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline').createInterface({
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
    } catch (error) {
        console.error(`Failed to execute ${command}`);
        return false;
    }
};

const question = (query) => new Promise((resolve) => readline.question(query, resolve));

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
        } catch (error) {}
    }

    console.log(`\n📝 Setting up ${envDisplayName} environment in ${envFileName}...`);

    let envContent = envKey === 'development' ? '# development\n' : `# ${envKey}\n`;

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

    console.log('\nCurrent environment variables:');
    Object.entries(envVars)
        .filter(([key]) => key !== 'DOTENV_VAULT')
        .forEach(([key, value]) => {
            console.log(`${key}=${value}`);
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
                console.log(`✅ Added ${newVar}=${value}`);
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
APP_FLAVOR=development # (development|staging|production)

# App Configuration
APP_NAME=MyApp

# Version
VERSION_CODE=1
VERSION_NAME=1.0.0

# API Configuration
API_URL=http://localhost:3000

# Add your other environment variables below
GOOGLE_API_KEY=
FACEBOOK_APP_ID=
SOME_OTHER_VAR=

${Object.keys(envVars)
    .filter(
        (key) => !['APP_FLAVOR', 'VERSION_CODE', 'VERSION_NAME', 'API_URL', 'APP_NAME', 'DOTENV_VAULT'].includes(key)
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
                                try {
                                    const envContent = fs.readFileSync('.env', 'utf8');
                                    envContent.split('\n').forEach((line) => {
                                        const [key, value] = line.split('=');
                                        if (key && value) {
                                            envVarsFromVault[key.trim()] = value.trim();
                                        }
                                    });
                                } catch (error) {
                                    console.error('Failed to read .env file:', error);
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.error('Failed to read .env.vault file:', error);
                    useVault = false;
                }
                break;

            case '2':
                fs.unlinkSync('.env.vault');
                console.log('✅ Removed existing .env.vault file');

                try {
                    console.log('\n📦 Creating new dotenv-vault...');
                    if (!runCommand('npx dotenv-vault@latest new')) {
                        console.log('\n⚠️ Failed to create new vault. Continuing with manual setup.');
                        useVault = false;
                    } else {
                        isNewVault = true;
                        useVault = true;
                    }
                } catch (error) {
                    console.error('Failed to create new vault:', error);
                    useVault = false;
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
                            try {
                                const envContent = fs.readFileSync('.env', 'utf8');
                                envContent.split('\n').forEach((line) => {
                                    const [key, value] = line.split('=');
                                    if (key && value) {
                                        envVarsFromVault[key.trim()] = value.trim();
                                    }
                                });
                            } catch (error) {
                                console.error('Failed to read .env file:', error);
                            }
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
                    try {
                        const envContent = fs.readFileSync('.env', 'utf8');
                        envContent.split('\n').forEach((line) => {
                            if (line && !line.startsWith('#')) {
                                const parts = line.split('=');
                                if (parts.length >= 2) {
                                    const key = parts[0].trim();
                                    const value = parts.slice(1).join('=').trim();
                                    if (key && value) {
                                        envVarsFromVault[key] = value;
                                    }
                                }
                            }
                        });
                        console.log(`✅ Loaded ${Object.keys(envVarsFromVault).length} variables from vault`);
                    } catch (error) {
                        console.error('Failed to read .env file:', error);
                    }
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
