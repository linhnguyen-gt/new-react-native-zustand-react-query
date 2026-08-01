import { QueryClient } from '@tanstack/react-query';

/**
 * The application's QueryClient.
 *
 * This used to be constructed inside the Reactotron query plugin, which meant the app's
 * production query behaviour lived in a debug tool and could not be changed without
 * editing it — and removing Reactotron would have removed the query client along with it.
 * The debug plugin now observes this client instead of owning it.
 */
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            gcTime: 10 * 60 * 1000, // 10 minutes (garbage collection time)
            retry: 2, // Number of retries

            /**
             * Left at its default (`true`) now that focus is a real signal.
             *
             * It was explicitly `false`, carried over from the Reactotron plugin that
             * originally owned this client. On React Native that override was close to a
             * no-op for the wrong reason: `focusManager`'s default listener watches
             * `visibilitychange`, which does not exist under Hermes, so the app was never
             * "focused" and nothing would have refetched either way.
             *
             * `reactQueryNativeBridge.ts` now drives `focusManager` from `AppState`, so
             * this option finally decides something: returning to the app refetches
             * queries that have gone stale. With `staleTime` at five minutes that costs a
             * request only when the data is genuinely old — leaving it `false` would have
             * meant re-wiring focus detection and then ignoring it.
             */
            refetchOnWindowFocus: true,
        },
    },
});
