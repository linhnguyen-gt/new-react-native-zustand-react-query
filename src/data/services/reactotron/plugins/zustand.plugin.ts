import { StateCreator } from 'zustand';

import { ReactotronCore } from '../reactotron.core';

export const zustandPlugin = (core: ReactotronCore) => ({
    enhancer:
        <T extends object>(storeName: string, config: StateCreator<T>): StateCreator<T> =>
        (set, get, store) => {
            let previousState: T | null = null;

            return config(
                (state) => {
                    const newState = typeof state === 'function' ? state(get()) : state;

                    const currentState = get();
                    previousState = previousState || currentState;

                    const changes = findObjectDifferences(previousState, { ...currentState, ...newState });

                    set(newState);

                    const finalState = get();

                    core.log({
                        type: 'ZUSTAND',
                        name: `🏪 ${storeName} Store`,
                        preview:
                            Object.keys(changes).length > 0
                                ? `Changed: ${Object.keys(changes).join(', ')}`
                                : 'State Updated',
                        value: {
                            currentState: finalState,
                            changes: changes,
                            previousValues: previousState
                                ? filterObjectByKeys(previousState, Object.keys(changes))
                                : {},
                            timestamp: new Date().toLocaleTimeString(),
                        },
                        color: getStoreColor(),
                    });

                    previousState = { ...finalState };

                    return newState;
                },
                get,
                store
            );
        },
});

function findObjectDifferences(oldObj: any, newObj: any): Record<string, any> {
    if (!oldObj || !newObj) return {};

    const changes: Record<string, any> = {};

    const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

    allKeys.forEach((key) => {
        if (!(key in oldObj) || !(key in newObj) || !isEqual(oldObj[key], newObj[key])) {
            changes[key] = newObj[key];
        }
    });

    return changes;
}

function filterObjectByKeys(obj: Record<string, any>, keys: string[]): Record<string, any> {
    return keys.reduce((result, key) => {
        if (key in obj) {
            result[key] = obj[key];
        }
        return result;
    }, {} as Record<string, any>);
}

function isEqual(a: any, b: any): boolean {
    if (typeof a === 'function' || typeof b === 'function') {
        return false;
    }

    if (a === b) return true;

    if (a == null || b == null) return a === b;

    if (typeof a !== typeof b) return false;

    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false;
        return a.every((val, index) => isEqual(val, b[index]));
    }

    if (typeof a === 'object' && typeof b === 'object') {
        const keysA = Object.keys(a);
        const keysB = Object.keys(b);

        if (keysA.length !== keysB.length) return false;

        return keysA.every((key) => keysB.includes(key) && isEqual(a[key], b[key]));
    }

    return false;
}

function getStoreColor(): string {
    return '#34495e';
}
