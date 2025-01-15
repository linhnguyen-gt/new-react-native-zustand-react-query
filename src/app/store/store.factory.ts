import { StateCreator, create } from "zustand";

import { reactotron } from "@/data";

export const createStore = <T extends object>(storeName: string, storeCreator: StateCreator<T>) => {
    if (__DEV__) {
        return create<T>()(reactotron.zustand.enhancer(storeName, storeCreator));
    }
    return create<T>()(storeCreator);
};
