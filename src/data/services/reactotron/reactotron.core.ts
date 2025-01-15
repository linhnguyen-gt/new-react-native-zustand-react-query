import AsyncStorage from "@react-native-async-storage/async-storage";
import Reactotron from "reactotron-react-native";

import { name } from "../../../../app.json";

type LogPayload = {
    type: "ZUSTAND" | "QUERY" | "API";
    name: string;
    preview: string;
    value: object | null;
};

export class ReactotronCore {
    private static instance: ReactotronCore;
    private tron: typeof Reactotron;

    private constructor() {
        this.tron = Reactotron.setAsyncStorageHandler(AsyncStorage)
            .configure({
                name
            })
            .useReactNative()
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
            this.tron.display({
                name: `${emoji} ${payload.name}`,
                preview: payload.preview,
                value: payload.value
            });
        }
    }

    private getEmojiForType(type: LogPayload["type"]): string {
        const emojiMap = {
            ZUSTAND: "🏪",
            QUERY: "🔍",
            API: "🌐"
        };
        return emojiMap[type];
    }
}
