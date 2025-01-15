/**
 * @format
 */

import { AppRegistry, LogBox } from "react-native";

import { name as appName } from "./app.json";
import "./gesture-handler";
import Root from "./src/Root";

LogBox.ignoreLogs(["The global process.env.EXPO_OS is not defined."]);

AppRegistry.registerComponent(appName, () => Root);
