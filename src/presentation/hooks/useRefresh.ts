import React from "react";

type IsRefreshing = boolean;
type OnRefresh = () => Promise<void>;

const useRefresh = (refresh: (() => void) | undefined): [IsRefreshing, OnRefresh] => {
    const [isRefreshing, setIsRefreshing] = React.useState<boolean>(false);

    const onRefresh = React.useCallback(async () => {
        setIsRefreshing(true);

        try {
            if (refresh) {
                refresh();
            }
        } finally {
            setIsRefreshing(false);
        }
    }, [refresh]);

    return [isRefreshing, onRefresh];
};

export default useRefresh;
