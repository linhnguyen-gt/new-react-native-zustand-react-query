const fs = require('fs');
const { writeFileAtomic } = require('../scripts/lib/write-file-atomic.cjs');
// Read here rather than handed in from `app.config.ts`.
//
// The table used to travel through `config.extra.nativeVariants`, which publishes
// build-time data into the runtime manifest of every shipped binary. Moving it to a plugin
// prop was the obvious fix and is not one: `Constants.expoConfig` is typed as `ExpoConfig`,
// which includes `plugins`, so props are not demonstrably private either. Reading the files
// here is the only version that provably ships nothing.
//
// This does couple the plugin to `scripts/lib/`, which `variant-config.cjs` argues against.
// That argument was already moot — this file has always required `write-file-atomic.cjs`
// from the same directory.
const { parseEnvFile } = require('../scripts/lib/parse-env-file.cjs');
const { VARIANTS, VARIANT_ENV_FILES } = require('../scripts/lib/variant-config.cjs');
const path = require('path');
const xcode = require('xcode');
const {
    AndroidConfig,
    withAndroidManifest,
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

/**
 * Builds the per-variant table this plugin generates native config from.
 *
 * Identity of values with the previous `extra.nativeVariants` version is what matters here,
 * since the generated Gradle flavors and Xcode schemes must not move: the static half comes
 * from the same `VARIANTS` table `app.config.ts` used, and the dynamic half from the same
 * env files it parsed, with the same precedence — the selected variant's process env first
 * (so `eas env:exec` and the shell win), then that variant's file, then a default.
 *
 * The per-field fallbacks are load-bearing: `expo prebuild` can run with no env files
 * present at all, and the output must still be complete.
 */
function getNativeVariants(config) {
    const selectedVariant = process.env.APP_VARIANT || process.env.APP_FLAVOR || DEFAULT_VARIANT_NAME;

    return VARIANT_NAMES.map((name) => {
        const staticConfig = VARIANTS[name] || {};
        const envFile = VARIANT_ENV_FILES[name] || (name === DEFAULT_VARIANT_NAME ? '.env' : `.env.${name}`);
        const fileEnv = parseEnvFile(path.join(config._internal?.projectRoot ?? process.cwd(), envFile));
        const selectedEnv = name === selectedVariant ? process.env : {};
        const value = (key, fallback) => selectedEnv[key] || fileEnv[key] || fallback;

        return {
            name,
            scheme: staticConfig.scheme || toSchemeName(name),
            bundleIdentifier: staticConfig.bundleIdentifier || config.ios?.bundleIdentifier,
            packageName: staticConfig.packageName || config.android?.package,
            displayName: value('APP_NAME', config.extra?.appDisplayName || config.name),
            envFile,
            versionCode: value('VERSION_CODE', config.android?.versionCode || 1),
            versionName: value('VERSION_NAME', config.version || '1.0.0'),
            updateChannel: value('EXPO_UPDATE_CHANNEL', staticConfig.updateChannel || name),
        };
    });
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

/**
 * Apply an anchored native mutation, refusing to continue if the anchor is gone.
 *
 * `String.replace` returns its input unchanged when the pattern does not match, and
 * nothing downstream can tell that apart from a successful edit. When an Expo or React
 * Native template bump reformats one of these anchors, prebuild would otherwise exit 0
 * having silently skipped the mutation.
 *
 * Two of the anchors fail loudly on the next build (a missing product flavor surfaces
 * as `Task 'installProductionDebug' not found`). The react-settings anchor does not: it
 * governs which `.env` gets embedded, so a silent miss produces a green production build
 * carrying development configuration. That case is why this asserts rather than warns.
 */
function applyAnchoredMutation({ contents, pattern, replacement, file, description }) {
    const next = contents.replace(pattern, replacement);

    if (next === contents) {
        throw new Error(
            [
                `[with-environment-support] Failed to apply "${description}" in ${file}.`,
                `The anchor ${pattern} no longer matches, most likely because an Expo or`,
                'React Native template update reformatted the surrounding code.',
                '',
                'The native project is now partially mutated. Restore it before retrying:',
                '    git checkout android/ ios/',
                '',
                'Then update the anchor in plugins/with-environment-support.cjs to match the',
                'current template.',
            ].join('\n')
        );
    }

    return next;
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

/**
 * Makes the deep-link scheme per-variant in the generated native projects.
 *
 * `app.config.ts` sets one real scheme — the variant currently being built — because the
 * Expo CLI opens that value after `expo run:*`. But prebuild writes a single Info.plist and
 * a single AndroidManifest that all three variants share, so whatever literal lands there
 * is wrong for the other two. Install dev and staging side by side and iOS stops being able
 * to tell them apart: it shows an "Open in …?" chooser, and an OAuth callback resolves to
 * whichever app the user taps.
 *
 * Both platforms already have a per-variant substitution mechanism, and this reuses them
 * rather than inventing a third: `$(APP_URL_SCHEME)` is an Xcode build setting written per
 * build configuration (the same trick as `$(APP_DISPLAY_NAME)`), and `${appScheme}` is a
 * Gradle manifest placeholder written per product flavor.
 *
 * `exp+<slug>` is deliberately dropped. It is the fallback scheme prebuild emits when no
 * `scheme` is configured, it is derived from the slug — which must stay identical across
 * variants because it identifies the EAS project — and it was the specific string behind
 * the chooser. With a real per-variant scheme configured, the dev client uses that instead.
 */
function withUrlScheme(config) {
    config = withInfoPlist(config, (config) => {
        config.modResults.CFBundleURLTypes = [{ CFBundleURLSchemes: ['$(APP_URL_SCHEME)'] }];
        return config;
    });

    config = withAndroidManifest(config, (config) => {
        const application = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);

        for (const activity of application.activity ?? []) {
            for (const filter of activity['intent-filter'] ?? []) {
                if (!filter.data) continue;

                const seen = new Set();

                filter.data = filter.data.filter((data) => {
                    const scheme = data.$?.['android:scheme'];

                    // Leave http/https app links alone — those are real hosts, shared by
                    // every variant. Only the app's own custom scheme is variant-specific.
                    if (scheme && scheme !== 'http' && scheme !== 'https') {
                        data.$['android:scheme'] = '${appScheme}';
                    }

                    // Both the configured scheme and the `exp+<slug>` fallback collapse onto
                    // the same placeholder, so without this the filter ends up declaring the
                    // identical `<data>` element twice.
                    const key = JSON.stringify(data.$ ?? {});
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                });
            }
        }

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
    return applyAnchoredMutation({
        contents,
        pattern: /def projectRoot = rootDir\.getAbsoluteFile\(\)\.getParentFile\(\)\.getAbsolutePath\(\)\n/,
        replacement: (match) => `${match}${block}`,
        file: 'android/app/build.gradle',
        description: 'android node wrapper',
    });
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
    return applyAnchoredMutation({
        contents,
        pattern: /(\s*bundleCommand = "export:embed"\n)/,
        replacement: `$1${block}`,
        file: 'android/app/build.gradle',
        description: 'react settings (selects the .env embedded in the bundle)',
    });
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
                appScheme: '${escapeSingleQuotedGradle(variant.packageName)}',
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
    return applyAnchoredMutation({
        contents,
        pattern: /(\n\s*signingConfigs\s*\{)/,
        replacement: `${block}$1`,
        file: 'android/app/build.gradle',
        description: 'product flavors',
    });
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
        // Already-rewritten content is not a failure: this plugin is re-entrant and
        // prebuild may run over a project it has mutated before.
        if (contents.includes(to)) {
            continue;
        }

        contents = applyAnchoredMutation({
            contents,
            // A global regex, not the bare string: `String.replace` with a string
            // pattern rewrites only the first occurrence, and these commands appear
            // more than once in the template.
            pattern: new RegExp(escapeRegExp(from), 'g'),
            replacement: to,
            file: 'android/app/build.gradle',
            description: `node command rewrite (${from.slice(0, 60)}…)`,
        });
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
        // Info.plist is shared by all three variants, so its CFBundleURLSchemes entry is
        // `$(APP_URL_SCHEME)` and the real value arrives from here, per configuration.
        APP_URL_SCHEME: variant.bundleIdentifier,
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
                writeFileAtomic(schemePath, createSchemeXml({ projectName, target, variant }));
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
    contents = applyAnchoredMutation({
        contents,
        pattern: /(platform :ios, .*?\n)/,
        replacement: `$1${block}`,
        file: 'ios/Podfile',
        description: 'ios per-variant pod configurations',
    });
    writeFileAtomic(podfilePath, contents);
}

function withEnvironmentSupport(config) {
    config = withPodfileProperties(config, (config) => {
        config.modResults['ios.deploymentTarget'] = '16.4';
        config.modResults.EX_DEV_CLIENT_NETWORK_INSPECTOR = 'false';
        return config;
    });

    config = withDisplayName(config);
    config = withUrlScheme(config);
    config = withAndroidRootNodeEnvironment(config);
    config = withAndroidEnvironmentFlavors(config);
    config = withIosEnvironmentConfigurations(config);
    config = withIosEnvironmentSchemes(config);

    return config;
}

module.exports = withEnvironmentSupport;

// Expo requires this module to *be* the plugin function, so the internals hang off it
// as a property. Exposed for tests: the anchored mutations are the part that fails
// silently in production, and a test is the only place a drifted anchor gets caught
// before a build ships the wrong .env.
module.exports.internal = {
    applyAnchoredMutation,
    ensureAndroidNodeWrapper,
    ensureAndroidReactSettings,
    ensureAndroidFlavors,
    // Exposed when this stopped being handed a ready-made table through
    // `config.extra.nativeVariants` and started reading the env files itself. Every
    // generated Gradle flavor and Xcode scheme is derived from its return value, and a
    // wrong value here produces a build that succeeds while carrying another variant's
    // configuration — the failure mode the anchored-mutation tests above exist for.
    getNativeVariants,
};
