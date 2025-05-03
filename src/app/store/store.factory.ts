import AsyncStorage from "@react-native-async-storage/async-storage";
import { StateCreator, StoreApi, create } from "zustand";
import { PersistOptions, createJSONStorage, persist } from "zustand/middleware";

import { reactotron } from "@/data/services";

interface StoreRegistryItem {
    name: string;
    api: StoreApi<unknown>;
    getInitialState: () => Record<string, unknown>;
}

const stores: StoreRegistryItem[] = [];

const resettable =
    <T extends object>(name: string, getInitialState: () => Partial<T>, config: StateCreator<T>): StateCreator<T> =>
    (set, get, api) => {
        stores.push({
            name,
            api: api as unknown as StoreApi<unknown>,
            getInitialState: getInitialState as unknown as () => Record<string, unknown>
        });

        return config(set, get, api);
    };

export const createStore = <T extends object>(
    storeName: string,
    storeCreator: StateCreator<T>,
    options?: {
        persist?: boolean;
        initialState?: Partial<T>;
    }
) => {
    const getInitialState = () => options?.initialState || ({} as Partial<T>);

    let finalCreator: StateCreator<T> = resettable(storeName, getInitialState, storeCreator);

    if (options?.persist) {
        const persistConfig: PersistOptions<T, Partial<T>> = {
            name: `store.${storeName}`,
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => {
                const partialState = { ...getInitialState() };
                const result = {} as Partial<T>;

                Object.keys(partialState).forEach((key) => {
                    const typedKey = key as keyof T;
                    if (typedKey in state) {
                        result[typedKey as keyof Partial<T>] = state[typedKey];
                    }
                });

                return result;
            }
        };

        finalCreator = persist(finalCreator, persistConfig) as unknown as StateCreator<T>;
    }

    if (__DEV__ && process.env.NODE_ENV !== "test") {
        return create<T>()(reactotron.zustand.enhancer(storeName, finalCreator));
    }

    return create<T>()(finalCreator);
};

export const resetAllStores = () => {
    stores.forEach((store) => {
        const initialState = store.getInitialState();
        store.api.setState(initialState, true);
    });
};
