/**
 * @format
 */

import { AppRegistry } from "react-native";

import { name as appName } from "./app.json";
import "./gesture-handler.native";
import Root from "./src/Root";

AppRegistry.registerComponent(appName, () => Root);
