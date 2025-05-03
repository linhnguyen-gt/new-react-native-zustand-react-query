import { Platform } from "react-native";

class Logger {
    static error(tag: string, message: any, ...args: any[]) {
        if (__DEV__) {
            console.error(`[${tag}]`, message, ...args);
        } else if (Platform.OS === "android") {
            console.warn(`[${tag}] ${JSON.stringify(message)}`, ...args);
        } else {
            console.error(`[${tag}]`, message, ...args);
        }
    }

    static info(tag: string, message: any, ...args: any[]) {
        if (__DEV__ || Platform.OS === "android") {
            console.error(`[${tag}]`, message, ...args);
        }
    }
}

export default Logger;
