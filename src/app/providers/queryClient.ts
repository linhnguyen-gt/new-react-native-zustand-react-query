import { QueryClient } from '@tanstack/react-query';

/**
 * The application's QueryClient.
 *
 * This used to be constructed inside the Reactotron query plugin, which meant the
 * app's production query behaviour lived in a debug tool and could not be changed
 * without editing it — and removing Reactotron would have removed the query client
 * along with it. The debug plugin now observes this client instead of owning it.
 *
 * Defaults are carried over unchanged from that plugin.
 */
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            gcTime: 10 * 60 * 1000, // 10 minutes (garbage collection time)
            retry: 2, // Number of retries
            refetchOnWindowFocus: false, // Disable refetch on window focus
        },
    },
});
