import { Dimensions } from "react-native";

export { default as Logger } from "./logger";
export * from "./navigation";
export * from "./storage";

export const fullWidth = Dimensions.get("window").width;

export const fullHeight = Dimensions.get("window").height;
