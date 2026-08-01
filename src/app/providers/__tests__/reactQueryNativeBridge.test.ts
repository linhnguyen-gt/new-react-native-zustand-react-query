import { focusManager, onlineManager } from '@tanstack/react-query';
import { AppState } from 'react-native';

import { installReactQueryNativeBridge } from '../reactQueryNativeBridge';

// `require`, not `jest.requireMock`: the stub is wired through `moduleNameMapper`, so the
// bridge and this file must resolve to the same module instance — and therefore the same
// listener set. `requireMock` builds a separate auto-mock whose `__emit` reaches nobody.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const netinfo = require('@react-native-community/netinfo') as {
    __emit: (state: { isConnected: boolean | null; isInternetReachable?: boolean | null }) => void;
    __reset: () => void;
    __listenerCount: () => number;
};

/**
 * These assertions are about wiring that does not exist by default on React Native.
 *
 * `onlineManager` reads `navigator.onLine` and `focusManager` watches `visibilitychange`;
 * neither exists under Hermes, so before this bridge the app was permanently "online" and
 * permanently "unfocused" — which made `refetchOnReconnect` and `refetchOnWindowFocus`
 * settings that could never fire.
 */
describe('installReactQueryNativeBridge', () => {
    let teardown: (() => void) | undefined;

    afterEach(() => {
        teardown?.();
        teardown = undefined;
        netinfo.__reset();
        jest.restoreAllMocks();
        // `onlineManager` and `focusManager` are module singletons shared across cases, so
        // a case that ends offline would otherwise start the next one offline.
        onlineManager.setOnline(true);
        focusManager.setFocused(true);
    });

    it('drives onlineManager from NetInfo connectivity', () => {
        teardown = installReactQueryNativeBridge();

        netinfo.__emit({ isConnected: false });
        expect(onlineManager.isOnline()).toBe(false);

        netinfo.__emit({ isConnected: true });
        expect(onlineManager.isOnline()).toBe(true);
    });

    it('treats a null isConnected as offline', () => {
        teardown = installReactQueryNativeBridge();

        // NetInfo reports `null` before the first probe resolves. Coercing it to "online"
        // would let queries dispatch into a connection that is not established yet.
        netinfo.__emit({ isConnected: null });

        expect(onlineManager.isOnline()).toBe(false);
    });

    it('ignores isInternetReachable', () => {
        teardown = installReactQueryNativeBridge();

        // A captive portal or a blocked probe host reports `isInternetReachable: false` on
        // a working connection. Consulting it would pause every query behind a signal the
        // user would call online.
        netinfo.__emit({ isConnected: true, isInternetReachable: false });

        expect(onlineManager.isOnline()).toBe(true);
    });

    it('drives focusManager from AppState', () => {
        const handlers: Array<(status: string) => void> = [];
        jest.spyOn(AppState, 'addEventListener').mockImplementation(((_event: string, handler: never) => {
            handlers.push(handler as unknown as (status: string) => void);
            return { remove: jest.fn() };
        }) as never);

        teardown = installReactQueryNativeBridge();

        handlers.forEach((handler) => handler('background'));
        expect(focusManager.isFocused()).toBe(false);

        handlers.forEach((handler) => handler('active'));
        expect(focusManager.isFocused()).toBe(true);
    });

    it('installs its listeners exactly once', () => {
        teardown = installReactQueryNativeBridge();
        const afterFirst = netinfo.__listenerCount();

        // The bridge is imported for its side effect, and a provider remount must not
        // stack a second subscription onto a process-wide manager.
        const second = installReactQueryNativeBridge();

        expect(netinfo.__listenerCount()).toBe(afterFirst);

        second();
    });
});
