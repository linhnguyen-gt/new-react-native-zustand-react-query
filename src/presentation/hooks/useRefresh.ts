import React from 'react';

type IsRefreshing = boolean;
type OnRefresh = () => Promise<void>;

/**
 * The refresh callback may be synchronous or return a promise.
 *
 * The permissive return type is what makes `await` below correct rather than
 * decorative. It was previously `() => void`, which still accepted React Query's
 * `refetch` — a function returning a promise — and then dropped that promise on the
 * floor: `setIsRefreshing(false)` ran in the same tick as `setIsRefreshing(true)`, so
 * `RefreshControl` snapped shut before the request had left the device. The spinner
 * was structurally unable to appear for the one caller it exists to serve.
 */
type RefreshCallback = () => void | Promise<unknown>;

const useRefresh = (refresh: RefreshCallback | undefined): [IsRefreshing, OnRefresh] => {
    const [isRefreshing, setIsRefreshing] = React.useState<boolean>(false);

    const onRefresh = React.useCallback(async () => {
        if (!refresh) return;

        setIsRefreshing(true);

        try {
            await refresh();
        } finally {
            setIsRefreshing(false);
        }
    }, [refresh]);

    return [isRefreshing, onRefresh];
};

export default useRefresh;
