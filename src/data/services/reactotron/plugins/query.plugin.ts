import { QueryClient } from "@tanstack/react-query";

import { ReactotronCore } from "../reactotron.core";

// Define a proper interface for our details object
interface QueryDetails {
    queryKey: any;
    status: string;
    dataUpdatedAt: string;
    data: any;
    error?: any; // Optional error property
    fetchStatus?: string; // Optional fetchStatus
    fetchMeta?: any; // Optional fetchMeta
}

// Define a proper interface for our mutation details object
interface MutationDetails {
    id: string;
    status: string;
    variables: any;
    data: any;
    error?: any; // Optional error property
    timestamp: string;
}

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
            const queryName = Array.isArray(query.queryKey)
                ? query.queryKey.join(" / ")
                : JSON.stringify(query.queryKey);

            let color = "#3498db";
            let emoji = "🔄";
            let isImportant = false;

            switch (query.state.status) {
                case "success":
                    color = "#2ecc71";
                    emoji = "✅";
                    break;
                case "error":
                    color = "#e74c3c";
                    emoji = "❌";
                    isImportant = true;
                    break;
                case "pending":
                    color = "#f39c12";
                    emoji = "⏳";
                    break;
            }

            const details: QueryDetails = {
                queryKey: query.queryKey,
                status: query.state.status,
                dataUpdatedAt: query.state.dataUpdatedAt
                    ? new Date(query.state.dataUpdatedAt).toLocaleTimeString()
                    : "N/A",
                data: query.state.data
            };

            if (query.state.status === "error" && query.state.error) {
                details.error = formatError(query.state.error);
            }

            if (query.state.fetchStatus !== "idle") {
                details.fetchStatus = query.state.fetchStatus;
            }

            if (query.state.fetchMeta) {
                details.fetchMeta = query.state.fetchMeta;
            }

            const isInitialLoad = type === "added" || (type === "updated" && query.state.fetchStatus === "fetching");
            const isPending = type === "updated" && query.state.status === "pending";

            let preview = `${query.state.status} (${type})`;
            if (isInitialLoad) {
                preview = "Loading...";
            } else if (isPending) {
                preview = "Fetching...";
            } else if (query.state.status === "error") {
                preview = query.state.error instanceof Error ? query.state.error.message : "Error occurred";
            } else if (query.state.status === "success") {
                preview = "Success";
            }

            if (
                type === "added" ||
                type === "removed" ||
                (type === "updated" &&
                    (query.state.status === "success" ||
                        query.state.status === "error" ||
                        query.state.fetchStatus === "fetching"))
            ) {
                core.log({
                    type: "QUERY",
                    name: `${emoji} Query: ${queryName}`,
                    preview,
                    value: details,
                    color,
                    important: isImportant
                });
            }
        });

        client.getMutationCache().subscribe(({ mutation, type }) => {
            if (!mutation) return;

            const mutationId = mutation.options.mutationKey
                ? Array.isArray(mutation.options.mutationKey)
                    ? mutation.options.mutationKey.join(" / ")
                    : JSON.stringify(mutation.options.mutationKey)
                : String(mutation.mutationId).substring(0, 8); // Convert to string before using substring

            let color = "#9b59b6";
            let emoji = "🔄";
            let isImportant = false;

            switch (mutation.state.status) {
                case "success":
                    color = "#2ecc71";
                    emoji = "✅";
                    break;
                case "error":
                    color = "#e74c3c";
                    emoji = "❌";
                    isImportant = true;
                    break;
                case "pending":
                    color = "#f39c12";
                    emoji = "⏳";
                    break;
            }

            const details: MutationDetails = {
                id: String(mutation.mutationId),
                status: mutation.state.status,
                variables: mutation.state.variables,
                data: mutation.state.data,
                timestamp: new Date().toLocaleTimeString()
            };

            if (mutation.state.status === "error" && mutation.state.error) {
                details.error = formatError(mutation.state.error);
            }

            let preview = `Mutation ${mutation.state.status}`;
            if (mutation.state.status === "error") {
                preview = mutation.state.error instanceof Error ? mutation.state.error.message : "Mutation failed";
            }

            if (type === "added" || (type === "updated" && mutation.state.status !== "idle")) {
                core.log({
                    type: "QUERY",
                    name: `${emoji} Mutation: ${mutationId}`,
                    preview,
                    value: details,
                    color,
                    important: isImportant
                });
            }
        });
    }

    return { client };
};

function formatError(error: unknown): any {
    if (!error) return "Unknown error";

    if (error instanceof Error) {
        return {
            name: error.name,
            message: error.message,
            stack: error.stack
        };
    }

    return error;
}
