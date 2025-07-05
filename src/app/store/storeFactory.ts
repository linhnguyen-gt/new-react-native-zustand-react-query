import { StateCreator, create } from "zustand";

import { reactotron } from "@/data/services/reactotron";

const storeResetFns = new Set<() => void>();

export const createStore = <T extends object>(storeName: string, storeCreator: StateCreator<T>) => {
    const createFn = () => {
        if (__DEV__) {
            return create<T>()(reactotron.zustand.enhancer(storeName, storeCreator));
        }
        return create<T>()(storeCreator);
    };

    const store = createFn();
    const initialState = store.getInitialState();

    storeResetFns.add(() => {
        store.setState(initialState, true);
    });

    return store;
};

export const resetAllStores = () => {
    storeResetFns.forEach((fn) => fn());
};
