import NetInfo from '@react-native-community/netinfo';
import { focusManager, onlineManager } from '@tanstack/react-query';
import { AppState, type AppStateStatus, type NativeEventSubscription } from 'react-native';

/**
 * Teaches React Query what "online" and "focused" mean on a device.
 *
 * React Query's defaults for both are browser APIs. `onlineManager` reads
 * `navigator.onLine` and listens for `window` online/offline events; `focusManager`
 * listens for `visibilitychange`. None of those exist under Hermes, so on React Native
 * the library falls back to assuming permanently-online and never-refocused.
 *
 * That is not a missing nicety, it is two defaults that silently do nothing:
 *
 * - `refetchOnReconnect` defaults to `true` and never fired, because no reconnect was
 *   ever observed. A query that failed in a tunnel stayed failed after signal returned.
 * - Paused mutations never resumed, for the same reason.
 * - Returning to the app after hours in the background refetched nothing, so the first
 *   screen a user saw was whatever the cache held when they left.
 *
 * Installed once, from module scope, rather than from an effect in a provider: these are
 * process-wide managers, and subscribing per mount would attach a second listener on
 * every remount of the tree.
 */

let installed = false;

/**
 * @returns a teardown function. Nothing in the app calls it — the subscriptions are meant
 * to live as long as the process — but tests need to unsubscribe between cases, and a
 * listener with no way to detach is a leak waiting for its first test.
 */
export const installReactQueryNativeBridge = (): (() => void) => {
    if (installed) {
        return () => undefined;
    }

    installed = true;

    onlineManager.setEventListener((setOnline) =>
        NetInfo.addEventListener((state) => {
            // `isInternetReachable` is deliberately not consulted. It is `null` until the
            // first reachability probe resolves and can sit `false` on captive portals and
            // on networks that block the probe host, which would report a working
            // connection as offline and pause every query behind it. `isConnected` is the
            // coarser signal and the one that matches what a user would call "online".
            setOnline(Boolean(state.isConnected));
        })
    );

    const handleAppStateChange = (status: AppStateStatus): void => {
        // An explicit boolean, never `undefined`. `setFocused(undefined)` means "fall back
        // to the default detector", and that detector watches `visibilitychange` — absent
        // under Hermes, so it reports focused unconditionally. Backgrounding the app would
        // then leave React Query believing it was still in the foreground, which is the
        // exact state this bridge exists to correct.
        //
        // `inactive` counts as unfocused alongside `background`: iOS reports it for the
        // app switcher and while the notification shade is down, and in none of those is
        // the user looking at data worth refetching.
        focusManager.setFocused(status === 'active');
    };

    const subscription: NativeEventSubscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
        subscription.remove();
        // A no-op listener, not `undefined`: `setEventListener` invokes whatever it is
        // given, so passing `undefined` throws inside the manager rather than detaching.
        onlineManager.setEventListener(() => () => undefined);
        installed = false;
    };
};
