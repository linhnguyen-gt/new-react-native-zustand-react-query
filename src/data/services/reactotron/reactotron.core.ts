import AsyncStorage from "@react-native-async-storage/async-storage";
import Reactotron from "reactotron-react-native";

import { name as appName } from "../../../../app.json";

type LogType =
    | "ZUSTAND"
    | "QUERY"
    | "API"
    | "INFO"
    | "SUCCESS"
    | "WARNING"
    | "ERROR"
    | "NETWORK"
    | "ACTION"
    | "EVENT"
    | "COMPONENT";

type LogPayload = {
    type: LogType;
    name: string;
    preview: string;
    value: object | null;
    important?: boolean;
    color?: string;
};

export class ReactotronCore {
    private static instance: ReactotronCore;
    private tron: typeof Reactotron;

    private constructor() {
        this.tron = Reactotron.setAsyncStorageHandler(AsyncStorage)
            .configure({
                name: appName
            })
            .useReactNative({
                networking: true,
                asyncStorage: true,
                editor: true,
                overlay: true,
                errors: true
            })
            .connect();

        if (__DEV__) {
            this.tron.clear!();
        }
    }

    public static getInstance(): ReactotronCore {
        if (!ReactotronCore.instance) {
            ReactotronCore.instance = new ReactotronCore();
        }
        return ReactotronCore.instance;
    }

    public log(payload: LogPayload): void {
        if (__DEV__) {
            const emoji = this.getEmojiForType(payload.type);

            const prefix = payload.important ? "‼️ IMPORTANT - " : "";

            let formattedValue = payload.value;
            if (typeof payload.value === "string") {
                formattedValue = { message: payload.value };
            }

            this.tron.display({
                name: `${emoji} ${prefix}${payload.name}`,
                preview: payload.preview,
                value: formattedValue
            });
        }
    }

    public logInfo(name: string, value: any, preview?: string): void {
        this.log({
            type: "INFO",
            name,
            preview: preview || "Info",
            value,
            color: "#3498db"
        });
    }

    public logSuccess(name: string, value: any, preview?: string): void {
        this.log({
            type: "SUCCESS",
            name,
            preview: preview || "Success",
            value,
            color: "#2ecc71"
        });
    }

    public logWarning(name: string, value: any, preview?: string): void {
        this.log({
            type: "WARNING",
            name,
            preview: preview || "Warning",
            value,
            color: "#f39c12",
            important: true
        });
    }

    public logError(name: string, error: any, preview?: string): void {
        let formattedError: any;

        if (error instanceof Error) {
            formattedError = {
                message: error.message,
                stack: error.stack,
                name: error.name,
                ...(error as any)
            };
        } else {
            formattedError = error;
        }

        this.log({
            type: "ERROR",
            name,
            preview: preview || "Error Occurred",
            value: formattedError,
            color: "#e74c3c",
            important: true
        });
    }

    public logNetwork(name: string, request: any, response?: any): void {
        this.log({
            type: "NETWORK",
            name,
            preview: response ? `${request.method || "GET"} ${response.status || ""}` : "Network Request",
            value: {
                request,
                response: response || "Pending..."
            },
            color: "#9b59b6"
        });
    }

    public logAction(name: string, action: any, state?: any): void {
        this.log({
            type: "ACTION",
            name,
            preview: `Action: ${name}`,
            value: { action, newState: state },
            color: "#f1c40f"
        });
    }

    public logComponent(name: string, props?: any, state?: any, renderTime?: number): void {
        this.log({
            type: "COMPONENT",
            name,
            preview: renderTime ? `Render time: ${renderTime}ms` : "Component",
            value: { props, state, renderTime },
            color: "#1abc9c"
        });
    }

    private getEmojiForType(type: LogType): string {
        const emojiMap: Record<LogType, string> = {
            ZUSTAND: "🏪",
            QUERY: "🔍",
            API: "🌐",
            INFO: "ℹ️",
            SUCCESS: "✅",
            WARNING: "⚠️",
            ERROR: "❌",
            NETWORK: "🔄",
            ACTION: "⚡",
            EVENT: "📢",
            COMPONENT: "🧩"
        };
        return emojiMap[type] || "📝";
    }
}
