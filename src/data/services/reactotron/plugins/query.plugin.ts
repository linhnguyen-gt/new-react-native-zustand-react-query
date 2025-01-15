import { QueryClient } from "@tanstack/react-query";

import { ReactotronCore } from "../reactotron.core";

export const queryPlugin = (core: ReactotronCore) => {
    const client = new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 5 * 60 * 1000, // 5 minutes
                gcTime: 10 * 60 * 1000, // 10 minutes (garbage collection time)
                retry: 2, // Number of retries
                refetchOnWindowFocus: false // Disable refetch on window focus
            }
        }
    });

    if (__DEV__) {
        client.getQueryCache().subscribe(({ type, query }) => {
            if (type === "updated" && query.state.status === "success") {
                core.log({
                    type: "QUERY",
                    name: query.queryKey.join(" / "),
                    preview: "Query Success",
                    value: { queryKey: query.queryKey, data: query.state.data }
                });
            }
        });
    }

    return { client };
};
