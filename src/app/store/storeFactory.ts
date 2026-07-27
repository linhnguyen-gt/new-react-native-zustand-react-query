import { StateCreator, create } from 'zustand';

import { Logger } from '@/shared/helper';

const storeResetFns = new Set<() => void>();

const getEnhancer = <T extends object>(storeName: string, config: StateCreator<T>): StateCreator<T> => {
    if (__DEV__) {
        try {
            // Inline require inside the __DEV__ block, not a module-scope import.
            // Metro does no cross-module dead-code elimination, so a static import
            // would ship Reactotron into release bundles even though this branch is
            // unreachable there. The minifier folds away a require() guarded by the
            // __DEV__ constant.
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { reactotron } = require('@/data/services/reactotron');
            if (reactotron?.zustand) {
                return reactotron.zustand.enhancer(storeName, config);
            }
        } catch (error) {
            Logger.warn('StoreFactory', 'Reactotron zustand enhancer failed, using default', error);
        }
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
