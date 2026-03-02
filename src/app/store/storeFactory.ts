import { StateCreator, create } from 'zustand';

import { reactotron } from '@/data/services';

const storeResetFns = new Set<() => void>();

const getEnhancer = <T extends object>(storeName: string, config: StateCreator<T>): StateCreator<T> => {
    if (__DEV__ && reactotron?.zustand) {
        return reactotron.zustand.enhancer(storeName, config);
    }
    return config;
};

export const createStore = <T extends object>(storeName: string, storeCreator: StateCreator<T>) => {
    const createFn = () => {
        if (__DEV__) {
            return create<T>()(getEnhancer(storeName, storeCreator));
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
