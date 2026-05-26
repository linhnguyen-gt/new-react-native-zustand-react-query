#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');

const variants = {
    development: {
        envFile: '.env',
    },
    staging: {
        envFile: '.env.staging',
    },
    production: {
        envFile: '.env.production',
    },
};

const parseEnv = (contents) =>
    contents.split(/\r?\n/).reduce((env, line) => {
        const nextLine = line.trim();

        if (!nextLine || nextLine.startsWith('#')) {
            return env;
        }

        const separatorIndex = nextLine.indexOf('=');
        if (separatorIndex === -1) {
            return env;
        }

        const key = nextLine.slice(0, separatorIndex).trim();
        const rawValue = nextLine.slice(separatorIndex + 1).trim();
        const value = rawValue.replace(/^(['"])(.*)\1$/, '$2');

        return {
            ...env,
            [key]: value,
        };
    }, {});

const readVariantEnv = (variantName) => {
    const envPath = path.join(projectRoot, variants[variantName].envFile);

    if (!fs.existsSync(envPath)) {
        return {};
    }

    return parseEnv(fs.readFileSync(envPath, 'utf8'));
};

const escapeSingleQuotedGradle = (value) => String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

const escapeXml = (value) =>
    String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

const formatXcodeValue = (value) => {
    const nextValue = String(value).replace(/"/g, '\\"');

    if (/^[A-Za-z0-9_.-]+$/.test(nextValue)) {
        return nextValue;
    }

    return `"${nextValue}"`;
};

const getDisplayNames = () =>
    Object.fromEntries(
        Object.keys(variants).map((variantName) => {
            const env = readVariantEnv(variantName);
            return [variantName, env.APP_NAME || variantName];
        })
    );

const replaceGradleFlavorAppName = (contents, variantName, displayName) => {
    const escapedDisplayName = escapeSingleQuotedGradle(displayName);
    const flavorPattern = new RegExp(
        `(${variantName}\\s*\\{[\\s\\S]*?resValue\\s+'string',\\s+'app_name',\\s+')[^']*(')`
    );

    return contents.replace(flavorPattern, `$1${escapedDisplayName}$2`);
};

const syncAndroidDisplayNames = (displayNames) => {
    const buildGradlePath = path.join(projectRoot, 'android/app/build.gradle');
    if (fs.existsSync(buildGradlePath)) {
        let contents = fs.readFileSync(buildGradlePath, 'utf8');

        for (const [variantName, displayName] of Object.entries(displayNames)) {
            contents = replaceGradleFlavorAppName(contents, variantName, displayName);
        }

        fs.writeFileSync(buildGradlePath, contents);
    }

    const stringsPath = path.join(projectRoot, 'android/app/src/main/res/values/strings.xml');
    if (fs.existsSync(stringsPath)) {
        const developmentDisplayName = displayNames.development;
        const contents = fs
            .readFileSync(stringsPath, 'utf8')
            .replace(
                /<string name="app_name">[^<]*<\/string>/,
                `<string name="app_name">${escapeXml(developmentDisplayName)}</string>`
            );

        fs.writeFileSync(stringsPath, contents);
    }
};

const replaceXcodeConfigAppName = (contents, variantName, displayName) => {
    const formattedDisplayName = formatXcodeValue(displayName);

    return contents
        .split(/(\n\t\t\};)/)
        .map((section) => {
            if (!section.includes(`APP_VARIANT = ${variantName};`)) {
                return section;
            }

            return section.replace(/APP_DISPLAY_NAME = .*?;/, `APP_DISPLAY_NAME = ${formattedDisplayName};`);
        })
        .join('');
};

const syncIosDisplayNames = (displayNames) => {
    const xcodeProjectRoot = path.join(projectRoot, 'ios/NewReactNativeZustandRNQ.xcodeproj');
    const pbxprojPath = path.join(xcodeProjectRoot, 'project.pbxproj');

    if (!fs.existsSync(pbxprojPath)) {
        return;
    }

    let contents = fs.readFileSync(pbxprojPath, 'utf8');

    for (const [variantName, displayName] of Object.entries(displayNames)) {
        contents = replaceXcodeConfigAppName(contents, variantName, displayName);
    }

    fs.writeFileSync(pbxprojPath, contents);
};

const displayNames = getDisplayNames();

syncAndroidDisplayNames(displayNames);
syncIosDisplayNames(displayNames);

console.log(
    `✅ Synced native APP_NAME values: ${Object.entries(displayNames)
        .map(([variantName, displayName]) => `${variantName}=${displayName}`)
        .join(', ')}`
);
