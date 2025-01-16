import { StateCreator, create } from "zustand";

import { reactotron } from "@/data";

export const createStore = <T extends object>(storeName: string, storeCreator: StateCreator<T>) => {
    if (process.env.NODE_ENV === "test") {
        return create<T>()(storeCreator);
    }

    if (__DEV__) {
        return create<T>()(reactotron.zustand.enhancer(storeName, storeCreator));
    }
    return create<T>()(storeCreator);
};
