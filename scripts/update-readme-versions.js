const fs = require("fs");
const path = require("path");

const packageJson = require("../package.json");

const readmePath = path.join(__dirname, "../README.md");
let readmeContent = fs.readFileSync(readmePath, "utf8");

const packagesToUpdate = {
    React_Native: packageJson.dependencies["react-native"],
    TypeScript: packageJson.devDependencies.typescript,
    Expo: packageJson.dependencies.expo,
    Gluestack_UI: packageJson.dependencies["@gluestack-ui/themed"],
    React_Navigation: packageJson.dependencies["@react-navigation/native"],
    Redux_Toolkit: packageJson.dependencies["@reduxjs/toolkit"],
    Redux_Saga: packageJson.dependencies["redux-saga"],
    Axios: packageJson.dependencies.axios,
    NativeWind: packageJson.dependencies.nativewind,
    Tailwind_CSS: packageJson.dependencies.tailwindcss,
    React_Hook_Form: packageJson.dependencies["react-hook-form"],
    Zod: packageJson.dependencies.zod,
    ESLint: packageJson.devDependencies.eslint,
    Prettier: packageJson.devDependencies.prettier,
    Jest: packageJson.devDependencies.jest,
    Dotenv: packageJson.dependencies.dotenv,
    Async_Storage: packageJson.dependencies["@react-native-async-storage/async-storage"],
    Reactotron: packageJson.dependencies["reactotron-react-native"],
    React_Native_Reanimated: packageJson.dependencies["react-native-reanimated"]
};

Object.entries(packagesToUpdate).forEach(([name, version]) => {
    if (version) {
        const cleanVersion = version.replace(/[\^~>=]/g, "");

        const badgeRegex = new RegExp(`(${name.replace(/_/g, "[_ ]")}-v)([0-9]+\\.[0-9]+\\.[0-9]+)`, "g");
        readmeContent = readmeContent.replace(badgeRegex, `$1${cleanVersion}`);
    }
});

fs.writeFileSync(readmePath, readmeContent);

console.log("✅ README.md versions updated successfully!");
