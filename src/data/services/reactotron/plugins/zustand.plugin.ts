import { StateCreator } from "zustand";

import { ReactotronCore } from "../reactotron.core";

export const zustandPlugin = (core: ReactotronCore) => ({
    enhancer:
        <T extends object>(storeName: string, config: StateCreator<T>): StateCreator<T> =>
        (set, get, store) =>
            config(
                (state) => {
                    const newState = typeof state === "function" ? state(get()) : state;
                    set(newState);
                    core.log({
                        type: "ZUSTAND",
                        name: storeName,
                        preview: "State Updated",
                        value: get()
                    });
                    return newState;
                },
                get,
                store
            )
});
