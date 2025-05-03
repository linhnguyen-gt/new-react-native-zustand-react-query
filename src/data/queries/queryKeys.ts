export const queryKeys = {
    responses: {
        all: ["responses"] as const,
        list: () => [...queryKeys.responses.all, "list"] as const,
        detail: (id: string) => [...queryKeys.responses.all, "detail", id] as const
    },
    auth: {
        all: ["auth"] as const,
        user: () => [...queryKeys.auth.all, "user"] as const,
        login: () => [...queryKeys.auth.all, "login"] as const
    }
    // TODO Add more query keys as needed
    // Example:
    // products: {
    //     all: ["products"] as const,
    //     list: () => [...queryKeys.products.all, "list"] as const,
    //     detail: (id: string) => [...queryKeys.products.all, "detail", id] as const
    // }
    // categories: {
    //     all: ["categories"] as const,
    //     list: () => [...queryKeys.categories.all, "list"] as const,
    //     detail: (id: string) => [...queryKeys.categories.all, "detail", id] as const
    // }
};
