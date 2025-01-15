const { execSync } = require("child_process");
const fs = require("fs");
const readline = require("readline").createInterface({
    input: process.stdin,
    output: process.stdout
});

const ENVIRONMENTS = ["development", "staging", "production"];

const runCommand = (command) => {
    try {
        execSync(command, { stdio: "inherit" });
        return true;
    } catch (error) {
        console.error(`Failed to execute ${command}`, error);
        return false;
    }
};

const question = (query) => new Promise((resolve) => readline.question(query, resolve));

const createEnvFiles = async (environment, vaultKey = null, envVarsFromVault = {}) => {
    let envVars = { ...envVarsFromVault };
    const envFileName = environment === "development" ? ".env" : `.env.${environment}`;

    console.log(`\n📝 Setting up ${environment} environment in ${envFileName}...`);

    let envContent = environment === "development" ? "# development\n" : `# ${environment}\n`;

    envVars.APP_FLAVOR = environment;

    if (vaultKey) {
        envVars.DOTENV_VAULT = vaultKey;
    }

    if (!envVars.API_URL || envVars.API_URL.trim() === "") {
        const defaultUrl = {
            development: "http://localhost:3000",
            staging: "https://api-staging.example.com",
            production: "https://api.example.com"
        }[environment];

        const apiUrl = await question(`Enter API_URL for ${environment} (default: ${defaultUrl}): `);
        envVars.API_URL = apiUrl || defaultUrl;
    }

    if (!envVars.VERSION_CODE) {
        envVars.VERSION_CODE = "1";
    }
    if (!envVars.VERSION_NAME) {
        envVars.VERSION_NAME = "1.0.0";
    }

    let addMore = true;
    while (addMore) {
        const answer = await question(
            `\nWould you like to add another environment variable for ${environment}? (y/n): `
        );
        if (answer.toLowerCase() === "y") {
            const newVar = await question("Enter variable name: ");
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
        .filter(([key]) => key !== "DOTENV_VAULT")
        .map(([key, value]) => `${key}=${value}`)
        .join("\n");

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
        let currentContent = "";
        if (fs.existsSync(".gitignore")) {
            currentContent = fs.readFileSync(".gitignore", "utf8");
        }

        if (!currentContent.includes(".env.example")) {
            fs.appendFileSync(".gitignore", gitignoreContent);
            console.log("✅ Updated .gitignore");
        }
        return true;
    } catch (error) {
        console.error("Failed to update .gitignore:", error);
        return false;
    }
};

const createEnvExample = (envVars) => {
    const exampleContent = `# This is an example environment file
# Copy this file to .env, .env.staging, or .env.production and update the values

# Environment
APP_FLAVOR=development # (development|staging|production)

# Version
VERSION_CODE=1
VERSION_NAME=1.0.0

# API Configuration
API_URL=http://localhost:3000

# Add your other environment variables below
${Object.keys(envVars)
    .filter((key) => !["APP_FLAVOR", "VERSION_CODE", "VERSION_NAME", "API_URL", "DOTENV_VAULT"].includes(key))
    .map((key) => `${key}=`)
    .join("\n")}
`;

    try {
        fs.writeFileSync(".env.example", exampleContent);
        console.log("✅ Created .env.example file");
        return true;
    } catch (error) {
        console.error("Failed to create .env.example:", error);
        return false;
    }
};

const main = async () => {
    console.log("🚀 Starting environment setup...");

    let vaultKey = null;
    let useVault = false;
    let isNewVault = false;
    let envVarsFromVault = {};

    // First, handle vault setup
    if (fs.existsSync(".env.vault")) {
        try {
            const vaultContent = fs.readFileSync(".env.vault", "utf8");
            const match = vaultContent.match(/DOTENV_VAULT=(.*)/);
            if (match && match[1]) {
                vaultKey = match[1].trim();
                useVault = true;
                console.log("✅ Found existing .env.vault file");

                console.log("\n📥 Pulling from vault...");
                if (!runCommand("npx dotenv-vault@latest pull")) {
                    process.exit(1);
                }

                if (fs.existsSync(".env")) {
                    try {
                        const envContent = fs.readFileSync(".env", "utf8");
                        envContent.split("\n").forEach((line) => {
                            const [key, value] = line.split("=");
                            if (key && value) {
                                envVarsFromVault[key.trim()] = value.trim();
                            }
                        });
                    } catch (error) {
                        console.error("Failed to read .env file:", error);
                    }
                }
            }
        } catch (error) {
            console.error("Failed to read .env.vault file:", error);
        }
    }

    if (!useVault) {
        const wantVault = await question("\nWould you like to use DOTENV_VAULT? (y/n): ");
        useVault = wantVault.toLowerCase() === "y";

        if (useVault) {
            const inputVaultKey = await question("\nEnter your DOTENV_VAULT key: ");
            if (inputVaultKey) {
                vaultKey = inputVaultKey;
                try {
                    fs.writeFileSync(".env.vault", `DOTENV_VAULT=${vaultKey}`);
                    console.log("✅ Created .env.vault file");

                    console.log("\n📥 Pulling existing environment variables...");
                    if (!runCommand("npx dotenv-vault@latest pull")) {
                        process.exit(1);
                    }

                    if (fs.existsSync(".env")) {
                        const envContent = fs.readFileSync(".env", "utf8");
                        envContent.split("\n").forEach((line) => {
                            const [key, value] = line.split("=");
                            if (key && value) {
                                envVarsFromVault[key.trim()] = value.trim();
                            }
                        });
                    }
                } catch (error) {
                    console.error("Failed to create .env.vault file:", error);
                    process.exit(1);
                }
            }
        } else {
            try {
                console.log("\n📦 Creating new dotenv-vault...");
                if (!runCommand("npx dotenv-vault@latest new")) {
                    process.exit(1);
                }
                isNewVault = true;
            } catch (error) {
                console.error("Failed to create new vault:", error);
                process.exit(1);
            }
        }
    }

    console.log("\n📝 Creating environment files...");
    for (const env of ENVIRONMENTS) {
        const envVars = await createEnvFiles(env, vaultKey, envVarsFromVault);
        if (!envVars) {
            process.exit(1);
        }
    }

    if (isNewVault) {
        console.log("\n🔑 Logging in to dotenv-vault...");
        if (!runCommand("npx dotenv-vault@latest login")) {
            process.exit(1);
        }

        console.log("\n⬆️ Pushing environments to vault...");

        console.log("\n📤 Pushing development environment...");
        if (!runCommand("npx dotenv-vault@latest push")) {
            process.exit(1);
        }

        console.log("\n📤 Pushing staging environment...");
        if (!runCommand("npx dotenv-vault@latest push staging")) {
            process.exit(1);
        }

        console.log("\n📤 Pushing production environment...");
        if (!runCommand("npx dotenv-vault@latest push production")) {
            process.exit(1);
        }
    }

    if (!updateGitignore()) {
        process.exit(1);
    }

    if (!createEnvExample(envVarsFromVault)) {
        process.exit(1);
    }

    console.log("\n✨ Environment setup completed successfully!");
    console.log("\n📝 Next steps:");
    console.log("1. Review your environment files:");
    ENVIRONMENTS.forEach((env) => {
        const fileName = env === "development" ? ".env" : `.env.${env}`;
        console.log(`   - ${fileName}`);
    });
    if (useVault) {
        console.log("2. Commit the .env.vault file");
        console.log("3. Share the .env.vault credentials with your team");
    }

    // Close readline interface
    readline.close();
};

main().catch((error) => {
    console.error(error);
    readline.close();
    process.exit(1);
});
