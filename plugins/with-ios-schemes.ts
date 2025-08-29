import * as fs from 'fs';
import * as path from 'path';

import { ConfigPlugin, withDangerousMod } from '@expo/config-plugins';

type SchemeConfig = {
    productScheme?: string;
    stagingScheme?: string;
};

const defaultProductScheme = `<?xml version="1.0" encoding="UTF-8"?>
<Scheme
   LastUpgradeVersion = "1640"
   version = "1.7">
   <BuildAction
      parallelizeBuildables = "YES"
      buildImplicitDependencies = "YES"
      buildArchitectures = "Automatic">
      <BuildActionEntries>
         <BuildActionEntry
            buildForTesting = "YES"
            buildForRunning = "YES"
            buildForProfiling = "YES"
            buildForArchiving = "YES"
            buildForAnalyzing = "YES">
            <BuildableReference
               BuildableIdentifier = "primary"
               BlueprintIdentifier = "13B07F861A680F5B00A75B9A"
               BuildableName = "NewReactNativeZustandRNQ.app"
               BlueprintName = "NewReactNativeZustandRNQ"
               ReferencedContainer = "container:NewReactNativeZustandRNQ.xcodeproj">
            </BuildableReference>
         </BuildActionEntry>
      </BuildActionEntries>
   </BuildAction>
   <TestAction
      buildConfiguration = "Product.Debug"
      selectedDebuggerIdentifier = "Xcode.DebuggerFoundation.Debugger.LLDB"
      selectedLauncherIdentifier = "Xcode.DebuggerFoundation.Launcher.LLDB"
      shouldUseLaunchSchemeArgsEnv = "YES"
      shouldAutocreateTestPlan = "YES">
   </TestAction>
   <LaunchAction
      buildConfiguration = "Product.Debug"
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
         <BuildableReference
            BuildableIdentifier = "primary"
            BlueprintIdentifier = "13B07F861A680F5B00A75B9A"
            BuildableName = "NewReactNativeZustandRNQ.app"
            BlueprintName = "NewReactNativeZustandRNQ"
            ReferencedContainer = "container:NewReactNativeZustandRNQ.xcodeproj">
         </BuildableReference>
      </BuildableProductRunnable>
   </LaunchAction>
   <ProfileAction
      buildConfiguration = "Product.Release"
      shouldUseLaunchSchemeArgsEnv = "YES"
      savedToolIdentifier = ""
      useCustomWorkingDirectory = "NO"
      debugDocumentVersioning = "YES">
      <BuildableProductRunnable
         runnableDebuggingMode = "0">
         <BuildableReference
            BuildableIdentifier = "primary"
            BlueprintIdentifier = "13B07F861A680F5B00A75B9A"
            BuildableName = "NewReactNativeZustandRNQ.app"
            BlueprintName = "NewReactNativeZustandRNQ"
            ReferencedContainer = "container:NewReactNativeZustandRNQ.xcodeproj">
         </BuildableReference>
      </BuildableProductRunnable>
   </ProfileAction>
   <AnalyzeAction
      buildConfiguration = "Product.Debug">
   </AnalyzeAction>
   <ArchiveAction
      buildConfiguration = "Product.Release"
      revealArchiveInOrganizer = "YES">
   </ArchiveAction>
</Scheme>
`;

const defaultStagingScheme = `<?xml version="1.0" encoding="UTF-8"?>
<Scheme
   LastUpgradeVersion = "1640"
   version = "1.7">
   <BuildAction
      parallelizeBuildables = "YES"
      buildImplicitDependencies = "YES"
      buildArchitectures = "Automatic">
      <BuildActionEntries>
         <BuildActionEntry
            buildForTesting = "YES"
            buildForRunning = "YES"
            buildForProfiling = "YES"
            buildForArchiving = "YES"
            buildForAnalyzing = "YES">
            <BuildableReference
               BuildableIdentifier = "primary"
               BlueprintIdentifier = "13B07F861A680F5B00A75B9A"
               BuildableName = "NewReactNativeZustandRNQ.app"
               BlueprintName = "NewReactNativeZustandRNQ"
               ReferencedContainer = "container:NewReactNativeZustandRNQ.xcodeproj">
            </BuildableReference>
         </BuildActionEntry>
      </BuildActionEntries>
   </BuildAction>
   <TestAction
      buildConfiguration = "Staging.Debug"
      selectedDebuggerIdentifier = "Xcode.DebuggerFoundation.Debugger.LLDB"
      selectedLauncherIdentifier = "Xcode.DebuggerFoundation.Launcher.LLDB"
      shouldUseLaunchSchemeArgsEnv = "YES"
      shouldAutocreateTestPlan = "YES">
   </TestAction>
   <LaunchAction
      buildConfiguration = "Staging.Debug"
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
         <BuildableReference
            BuildableIdentifier = "primary"
            BlueprintIdentifier = "13B07F861A680F5B00A75B9A"
            BuildableName = "NewReactNativeZustandRNQ.app"
            BlueprintName = "NewReactNativeZustandRNQ"
            ReferencedContainer = "container:NewReactNativeZustandRNQ.xcodeproj">
         </BuildableReference>
      </BuildableProductRunnable>
   </LaunchAction>
   <ProfileAction
      buildConfiguration = "Staging.Release"
      shouldUseLaunchSchemeArgsEnv = "YES"
      savedToolIdentifier = ""
      useCustomWorkingDirectory = "NO"
      debugDocumentVersioning = "YES">
      <BuildableProductRunnable
         runnableDebuggingMode = "0">
         <BuildableReference
            BuildableIdentifier = "primary"
            BlueprintIdentifier = "13B07F861A680F5B00A75B9A"
            BuildableName = "NewReactNativeZustandRNQ.app"
            BlueprintName = "NewReactNativeZustandRNQ"
            ReferencedContainer = "container:NewReactNativeZustandRNQ.xcodeproj">
         </BuildableReference>
      </BuildableProductRunnable>
   </ProfileAction>
   <AnalyzeAction
      buildConfiguration = "Staging.Debug">
   </AnalyzeAction>
   <ArchiveAction
      buildConfiguration = "Staging.Release"
      revealArchiveInOrganizer = "YES">
   </ArchiveAction>
</Scheme>
`;

export const withIosSchemes: ConfigPlugin<SchemeConfig | void> = (config, props) => {
    return withDangerousMod(config, [
        'ios',
        async (cfg) => {
            const projectName = cfg.modRequest.projectName ?? 'NewReactNativeZustandRNQ';
            const schemesDir = path.join(
                cfg.modRequest.projectRoot,
                'ios',
                `${projectName}.xcodeproj`,
                'xcshareddata',
                'xcschemes'
            );
            fs.mkdirSync(schemesDir, { recursive: true });

            const productPath = path.join(schemesDir, 'Product.xcscheme');
            const stagingPath = path.join(schemesDir, 'Staging.xcscheme');

            const productScheme = props?.productScheme ?? defaultProductScheme;
            const stagingScheme = props?.stagingScheme ?? defaultStagingScheme;

            fs.writeFileSync(productPath, productScheme, { encoding: 'utf8' });
            fs.writeFileSync(stagingPath, stagingScheme, { encoding: 'utf8' });

            return cfg;
        },
    ]);
};

export default withIosSchemes;
