const fs = require('fs');
const path = require('path');
const xcode = require('xcode');
const {
    AndroidConfig,
    withAppBuildGradle,
    withDangerousMod,
    withInfoPlist,
    withPodfileProperties,
    withProjectBuildGradle,
    withStringsXml,
    withXcodeProject,
} = require('@expo/config-plugins');

const VARIANT_NAMES = ['development', 'staging', 'production'];
const DEFAULT_VARIANT_NAME = 'development';
const BUILD_TYPES = [
    { name: 'Debug', podType: ':debug' },
    { name: 'Release', podType: ':release' },
];
const GENERATED_BEGIN = '// @generated begin environment support';
const GENERATED_END = '// @generated end environment support';

function getNativeVariants(config) {
    const variants = config.extra?.nativeVariants || {};

    return VARIANT_NAMES.map((name) => ({
        name,
        scheme: variants[name]?.scheme || toSchemeName(name),
        bundleIdentifier: variants[name]?.bundleIdentifier || config.ios?.bundleIdentifier,
        packageName: variants[name]?.packageName || config.android?.package,
        displayName: variants[name]?.displayName || config.extra?.appDisplayName || config.name,
        envFile: variants[name]?.envFile || (name === 'development' ? '.env' : `.env.${name}`),
        versionCode: variants[name]?.versionCode || config.android?.versionCode || 1,
        versionName: variants[name]?.versionName || config.version || '1.0.0',
        updateChannel: variants[name]?.updateChannel || name,
    }));
}

function toSchemeName(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
}

function getDefaultVariant(variants) {
    return variants.find((variant) => variant.name === DEFAULT_VARIANT_NAME) || variants[0];
}

function getExplicitIosVariants(variants) {
    return variants.filter((variant) => variant.name !== DEFAULT_VARIANT_NAME);
}

function escapeSingleQuotedGradle(value) {
    return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function quoteXcodeValue(value) {
    return `"${String(value).replace(/"/g, '\\"')}"`;
}

function removeGeneratedBlock(contents, marker) {
    const block = new RegExp(`\\n?${escapeRegExp(marker.begin)}[\\s\\S]*?${escapeRegExp(marker.end)}\\n?`, 'g');
    return contents.replace(block, '\n');
}

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function withDisplayName(config) {
    config = withInfoPlist(config, (config) => {
        config.modResults.CFBundleDisplayName = '$(APP_DISPLAY_NAME)';
        return config;
    });

    config = withStringsXml(config, (config) => {
        config.modResults = AndroidConfig.Strings.setStringItem(
            [
                {
                    $: {
                        name: 'app_name',
                    },
                    _: config.extra?.appDisplayName || config.name,
                },
            ],
            config.modResults
        );
        return config;
    });

    return config;
}

function withAndroidEnvironmentFlavors(config) {
    return withAppBuildGradle(config, (config) => {
        const variants = getNativeVariants(config);
        let contents = config.modResults.contents;

        contents = ensureAndroidNodeWrapper(contents);
        contents = ensureAndroidReactSettings(contents, variants);
        contents = ensureAndroidFlavors(contents, variants);
        contents = replaceAndroidNodeCommands(contents);

        config.modResults.contents = contents;
        return config;
    });
}

function withAndroidRootNodeEnvironment(config) {
    return withProjectBuildGradle(config, (config) => {
        const variants = getNativeVariants(config);
        const marker = {
            begin: `${GENERATED_BEGIN} - root android node environment`,
            end: `${GENERATED_END} - root android node environment`,
        };
        const envFileEntries = variants.map((variant) => `'${variant.name}': '${variant.envFile}'`).join(', ');
        const block = `
${marker.begin}
def appVariantNames = [${VARIANT_NAMES.map((name) => `'${name}'`).join(', ')}]
def appVariantEnvFiles = [${envFileEntries}]
def resolveAppVariantFromGradleTasks = {
    def taskNames = gradle.startParameter.taskNames.collect { it.toLowerCase() }
    def taskVariant = appVariantNames.find { variantName ->
        taskNames.any { taskName -> taskName.contains(variantName.toLowerCase()) }
    }

    return taskVariant ?: (findProperty('appVariant') ?: System.getenv('APP_VARIANT') ?: '${VARIANT_NAMES[0]}').toString()
}
subprojects { subproject ->
    subproject.afterEvaluate {
        subproject.tasks.matching { task -> task.name == 'createExpoConfig' }.configureEach { task ->
            def appVariant = resolveAppVariantFromGradleTasks()
            task.environment('APP_VARIANT', appVariant)
            task.environment('APP_FLAVOR', appVariant)
            task.environment('ENVFILE', appVariantEnvFiles[appVariant] ?: '.env')
        }
    }
}
${marker.end}
`;

        let contents = removeGeneratedBlock(config.modResults.contents, marker);
        contents = `${block}\n${contents}`;
        config.modResults.contents = contents;

        return config;
    });
}

function ensureAndroidNodeWrapper(contents) {
    const marker = {
        begin: `${GENERATED_BEGIN} - android node wrapper`,
        end: `${GENERATED_END} - android node wrapper`,
    };
    const block = `
${marker.begin}
def appVariantNames = [${VARIANT_NAMES.map((name) => `'${name}'`).join(', ')}]
def resolveAppVariantFromGradleTasks = {
    def taskNames = gradle.startParameter.taskNames.collect { it.toLowerCase() }
    def taskVariant = appVariantNames.find { variantName ->
        taskNames.any { taskName -> taskName.contains(variantName.toLowerCase()) }
    }

    return taskVariant ?: (findProperty('appVariant') ?: System.getenv('APP_VARIANT') ?: '${VARIANT_NAMES[0]}').toString()
}
def appVariantNodeCommand = { List commandArgs ->
    return ['node', file("\${projectRoot}/scripts/node-with-app-variant.cjs").absolutePath, resolveAppVariantFromGradleTasks()] + commandArgs
}
${marker.end}
`;

    contents = removeGeneratedBlock(contents, marker);
    return contents.replace(
        /def projectRoot = rootDir\.getAbsoluteFile\(\)\.getParentFile\(\)\.getAbsolutePath\(\)\n/,
        (match) => `${match}${block}`
    );
}

function ensureAndroidReactSettings(contents, variants) {
    const marker = {
        begin: `${GENERATED_BEGIN} - react settings`,
        end: `${GENERATED_END} - react settings`,
    };
    const debuggableVariants = variants.map((variant) => `'${variant.name}Debug'`).join(', ');
    const block = `
    ${marker.begin}
    debuggableVariants = [${debuggableVariants}]
    nodeExecutableAndArgs = ['node', file("\${projectRoot}/scripts/node-with-app-variant.cjs").absolutePath, resolveAppVariantFromGradleTasks()]
    ${marker.end}
`;

    contents = removeGeneratedBlock(contents, marker);
    return contents.replace(/(\s*bundleCommand = "export:embed"\n)/, `$1${block}`);
}

function ensureAndroidFlavors(contents, variants) {
    const marker = {
        begin: `${GENERATED_BEGIN} - product flavors`,
        end: `${GENERATED_END} - product flavors`,
    };
    const flavorBlocks = variants
        .map(
            (variant) => `
        ${variant.name} {
            dimension 'environment'
            ${variant.name === DEFAULT_VARIANT_NAME ? 'isDefault = true\n            ' : ''}applicationId '${escapeSingleQuotedGradle(variant.packageName)}'
            versionCode ${parseInt(variant.versionCode, 10) || 1}
            versionName '${escapeSingleQuotedGradle(variant.versionName)}'
            resValue 'string', 'app_name', '${escapeSingleQuotedGradle(variant.displayName)}'
            manifestPlaceholders = [
                appVariant: '${escapeSingleQuotedGradle(variant.name)}',
                updateChannel: '${escapeSingleQuotedGradle(variant.updateChannel)}'
            ]
        }`
        )
        .join('\n');
    const block = `
    ${marker.begin}
    flavorDimensions 'environment'
    productFlavors {${flavorBlocks}
    }
    ${marker.end}
`;

    contents = removeGeneratedBlock(contents, marker);
    return contents.replace(/(\n\s*signingConfigs\s*\{)/, `${block}$1`);
}

function replaceAndroidNodeCommands(contents) {
    const replacements = new Map([
        [
            `["node", "-e", "require('expo/scripts/resolveAppEntry')", projectRoot, "android", "absolute"].execute(null, rootDir)`,
            `appVariantNodeCommand(["-e", "require('expo/scripts/resolveAppEntry')", projectRoot, "android", "absolute"]).execute(null, rootDir)`,
        ],
        [
            `["node", "--print", "require.resolve('react-native/package.json')"].execute(null, rootDir)`,
            `appVariantNodeCommand(["--print", "require.resolve('react-native/package.json')"]).execute(null, rootDir)`,
        ],
        [
            `["node", "--print", "require.resolve('hermes-compiler/package.json', { paths: [require.resolve('react-native/package.json')] })"].execute(null, rootDir)`,
            `appVariantNodeCommand(["--print", "require.resolve('hermes-compiler/package.json', { paths: [require.resolve('react-native/package.json')] })"]).execute(null, rootDir)`,
        ],
        [
            `["node", "--print", "require.resolve('@react-native/codegen/package.json', { paths: [require.resolve('react-native/package.json')] })"].execute(null, rootDir)`,
            `appVariantNodeCommand(["--print", "require.resolve('@react-native/codegen/package.json', { paths: [require.resolve('react-native/package.json')] })"]).execute(null, rootDir)`,
        ],
        [
            `["node", "--print", "require.resolve('@expo/cli', { paths: [require.resolve('expo/package.json')] })"].execute(null, rootDir)`,
            `appVariantNodeCommand(["--print", "require.resolve('@expo/cli', { paths: [require.resolve('expo/package.json')] })"]).execute(null, rootDir)`,
        ],
    ]);

    for (const [from, to] of replacements) {
        contents = contents.replaceAll(from, to);
    }

    return contents;
}

function withIosEnvironmentConfigurations(config) {
    return withXcodeProject(config, (config) => {
        const variants = getNativeVariants(config);
        const project = config.modResults;
        const target = project.getFirstTarget().firstTarget;
        const projectObject = project.getFirstProject().firstProject;

        ensureBuildConfigurations(project, target.buildConfigurationList, variants, true);
        ensureBuildConfigurations(project, projectObject.buildConfigurationList, variants, false);

        config.modResults = project;
        return config;
    });
}

function ensureBuildConfigurations(project, configurationListId, variants, isTargetConfig) {
    const buildConfigurations = project.pbxXCBuildConfigurationSection();
    const configurationList = project.pbxXCConfigurationList()[configurationListId];
    const defaultVariant = getDefaultVariant(variants);
    const explicitVariants = getExplicitIosVariants(variants);

    if (!configurationList) {
        return;
    }

    for (const buildType of BUILD_TYPES) {
        const configurationId = findConfigurationId(configurationList, buildConfigurations, buildType.name);

        if (configurationId) {
            applyIosVariantBuildSettings(buildConfigurations[configurationId], defaultVariant, isTargetConfig);
        }
    }

    for (const variant of explicitVariants) {
        for (const buildType of BUILD_TYPES) {
            const configurationName = `${variant.scheme}.${buildType.name}`;
            const templateId = findConfigurationId(configurationList, buildConfigurations, buildType.name);
            const configurationId =
                findConfigurationId(configurationList, buildConfigurations, configurationName) ||
                addBuildConfiguration(project, configurationList, buildConfigurations, templateId, configurationName);

            applyIosVariantBuildSettings(buildConfigurations[configurationId], variant, isTargetConfig);
        }
    }
}

function applyIosVariantBuildSettings(configuration, variant, isTargetConfig) {
    const buildSettings = configuration.buildSettings || {};
    configuration.buildSettings = {
        ...buildSettings,
        APP_DISPLAY_NAME: quoteXcodeValue(variant.displayName),
        APP_VARIANT: variant.name,
        ENVFILE: variant.envFile,
        EXPO_UPDATE_CHANNEL: variant.updateChannel,
        MARKETING_VERSION: variant.versionName,
        CURRENT_PROJECT_VERSION: String(variant.versionCode),
        ...(isTargetConfig
            ? {
                  INFOPLIST_KEY_CFBundleDisplayName: quoteXcodeValue('$(APP_DISPLAY_NAME)'),
                  PRODUCT_BUNDLE_IDENTIFIER: variant.bundleIdentifier,
              }
            : {}),
    };
}

function findConfigurationId(configurationList, buildConfigurations, name) {
    const item = configurationList.buildConfigurations.find(
        (configuration) => buildConfigurations[configuration.value]?.name === name
    );

    return item?.value;
}

function addBuildConfiguration(project, configurationList, buildConfigurations, templateId, name) {
    const id = project.generateUuid();
    const template = templateId ? buildConfigurations[templateId] : { isa: 'XCBuildConfiguration', buildSettings: {} };
    const nextConfiguration = JSON.parse(JSON.stringify(template));
    nextConfiguration.name = name;
    nextConfiguration.buildSettings = { ...(nextConfiguration.buildSettings || {}) };

    buildConfigurations[id] = nextConfiguration;
    buildConfigurations[`${id}_comment`] = name;
    configurationList.buildConfigurations.push({ value: id, comment: name });

    return id;
}

function withIosEnvironmentSchemes(config) {
    return withDangerousMod(config, [
        'ios',
        (config) => {
            const variants = getNativeVariants(config);
            const explicitVariants = getExplicitIosVariants(variants);
            const iosRoot = config.modRequest.platformProjectRoot;
            const projectName = config.modRequest.projectName;
            const xcodeProjectPath = path.join(iosRoot, `${projectName}.xcodeproj`, 'project.pbxproj');
            const parsedProject = xcode.project(xcodeProjectPath);
            parsedProject.parseSync();

            const target = parsedProject.getFirstTarget();
            const schemesDir = path.join(iosRoot, `${projectName}.xcodeproj`, 'xcshareddata', 'xcschemes');
            fs.mkdirSync(schemesDir, { recursive: true });

            const developmentSchemePath = path.join(schemesDir, `${toSchemeName(DEFAULT_VARIANT_NAME)}.xcscheme`);
            if (fs.existsSync(developmentSchemePath)) {
                fs.unlinkSync(developmentSchemePath);
            }

            for (const variant of explicitVariants) {
                const schemePath = path.join(schemesDir, `${variant.scheme}.xcscheme`);
                fs.writeFileSync(schemePath, createSchemeXml({ projectName, target, variant }), 'utf8');
            }

            updatePodfileProjectMappings(iosRoot, projectName, explicitVariants);

            return config;
        },
    ]);
}

function createSchemeXml({ projectName, target, variant }) {
    const buildableName = `${target.firstTarget.productName || projectName}.app`;
    const blueprintName = target.firstTarget.name || projectName;
    const debugConfiguration = `${variant.scheme}.Debug`;
    const releaseConfiguration = `${variant.scheme}.Release`;

    return `<?xml version="1.0" encoding="UTF-8"?>
<Scheme
   LastUpgradeVersion = "1130"
   version = "1.3">
   <BuildAction
      parallelizeBuildables = "YES"
      buildImplicitDependencies = "YES">
      <BuildActionEntries>
         <BuildActionEntry
            buildForTesting = "YES"
            buildForRunning = "YES"
            buildForProfiling = "YES"
            buildForArchiving = "YES"
            buildForAnalyzing = "YES">
            ${createBuildableReferenceXml({ projectName, targetUuid: target.uuid, buildableName, blueprintName }, 12)}
         </BuildActionEntry>
      </BuildActionEntries>
   </BuildAction>
   <TestAction
      buildConfiguration = "${debugConfiguration}"
      selectedDebuggerIdentifier = "Xcode.DebuggerFoundation.Debugger.LLDB"
      selectedLauncherIdentifier = "Xcode.DebuggerFoundation.Launcher.LLDB"
      shouldUseLaunchSchemeArgsEnv = "YES">
      <Testables>
      </Testables>
   </TestAction>
   <LaunchAction
      buildConfiguration = "${debugConfiguration}"
      selectedDebuggerIdentifier = "Xcode.DebuggerFoundation.Debugger.LLDB"
      selectedLauncherIdentifier = "Xcode.DebuggerFoundation.Launcher.LLDB"
      launchStyle = "0"
      useCustomWorkingDirectory = "NO"
      ignoresPersistentStateOnLaunch = "NO"
      debugDocumentVersioning = "YES"
      debugServiceExtension = "internal"
      allowLocationSimulation = "YES">
      <BuildableProductRunnable
         runnableDebuggingMode = "0">
         ${createBuildableReferenceXml({ projectName, targetUuid: target.uuid, buildableName, blueprintName }, 9)}
      </BuildableProductRunnable>
   </LaunchAction>
   <ProfileAction
      buildConfiguration = "${releaseConfiguration}"
      shouldUseLaunchSchemeArgsEnv = "YES"
      savedToolIdentifier = ""
      useCustomWorkingDirectory = "NO"
      debugDocumentVersioning = "YES">
      <BuildableProductRunnable
         runnableDebuggingMode = "0">
         ${createBuildableReferenceXml({ projectName, targetUuid: target.uuid, buildableName, blueprintName }, 9)}
      </BuildableProductRunnable>
   </ProfileAction>
   <AnalyzeAction
      buildConfiguration = "${debugConfiguration}">
   </AnalyzeAction>
   <ArchiveAction
      buildConfiguration = "${releaseConfiguration}"
      revealArchiveInOrganizer = "YES">
   </ArchiveAction>
</Scheme>
`;
}

function createBuildableReferenceXml({ projectName, targetUuid, buildableName, blueprintName }, indent) {
    const spaces = ' '.repeat(indent);

    return `<BuildableReference
${spaces}   BuildableIdentifier = "primary"
${spaces}   BlueprintIdentifier = "${targetUuid}"
${spaces}   BuildableName = "${buildableName}"
${spaces}   BlueprintName = "${blueprintName}"
${spaces}   ReferencedContainer = "container:${projectName}.xcodeproj">
${spaces}</BuildableReference>`;
}

function updatePodfileProjectMappings(iosRoot, projectName, variants) {
    const podfilePath = path.join(iosRoot, 'Podfile');
    if (!fs.existsSync(podfilePath)) {
        return;
    }

    const marker = {
        begin: '# @generated begin environment support - podfile project mappings',
        end: '# @generated end environment support - podfile project mappings',
    };
    let contents = fs.readFileSync(podfilePath, 'utf8');
    const mappings = [
        "  'Debug' => :debug,",
        "  'Release' => :release,",
        ...variants.flatMap((variant) =>
            BUILD_TYPES.map((buildType) => `  '${variant.scheme}.${buildType.name}' => ${buildType.podType},`)
        ),
    ].join('\n');
    const block = `
${marker.begin}
project '${projectName}', {
${mappings}
}
${marker.end}
`;

    contents = removeGeneratedBlock(contents, marker);
    contents = contents.replace(/(platform :ios, .*?\n)/, `$1${block}`);
    fs.writeFileSync(podfilePath, contents, 'utf8');
}

function withEnvironmentSupport(config) {
    config = withPodfileProperties(config, (config) => {
        config.modResults['ios.deploymentTarget'] = '16.4';
        config.modResults.EX_DEV_CLIENT_NETWORK_INSPECTOR = 'false';
        return config;
    });

    config = withDisplayName(config);
    config = withAndroidRootNodeEnvironment(config);
    config = withAndroidEnvironmentFlavors(config);
    config = withIosEnvironmentConfigurations(config);
    config = withIosEnvironmentSchemes(config);

    return config;
}

module.exports = withEnvironmentSupport;
