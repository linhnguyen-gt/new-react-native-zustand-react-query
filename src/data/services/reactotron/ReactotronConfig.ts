import { TurboModuleRegistry } from "react-native";

export interface ReactotronConfig {
    /** The name of the app. */
    name?: string;
    /** The host to connect to: default 'localhost'. */
    host?: string;
    /** Should we use async storage */
    useAsyncStorage?: boolean;
    ignoreUrls?: RegExp;
    clearOnLoad?: boolean;
    /** Root state logging. */
    state?: {
        /** log the initial data that we put into the state on startup? */
        initial?: boolean;
        /** log snapshot changes. */
        snapshots?: boolean;
    };
    exceptActions?: string[];
}

/**
 * The default Reactotron configuration.
 */
const host =
    (TurboModuleRegistry.getEnforcing("SourceCode")?.getConstants?.() as { scriptURL?: string })?.scriptURL
        ?.split("://")[1]
        ?.split(":")[0] ?? "localhost";
export const DEFAULT_REACTOTRON_CONFIG: ReactotronConfig = {
    clearOnLoad: true,
    host,
    useAsyncStorage: true,
    ignoreUrls: /(logs|symbolicate)$/,
    state: {
        initial: true,
        snapshots: false
    },
    exceptActions: ["persist/PERSIST", "persist/REHYDRATE"]
};
