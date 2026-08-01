/**
 * Query keys for the `responses` domain, in one place.
 *
 * Keys used to be written inline at the `useQuery` call (`['responses', 'list']`), which
 * made invalidation stringly-typed: nothing connected the key a query registers with the
 * key a mutation would have to invalidate, and a typo in either produced silence rather
 * than an error. `docs/system-architecture.md` recorded "No invalidateQueries today" as a
 * standing state — this is the missing half of that.
 *
 * The hierarchy is prefix-shaped on purpose. React Query matches keys by prefix, so
 * invalidating `all` reaches every response query, `lists()` reaches every list without
 * touching a detail, and `detail(id)` reaches exactly one.
 */
export const responseKeys = {
    all: ['responses'] as const,
    lists: () => [...responseKeys.all, 'list'] as const,
    details: () => [...responseKeys.all, 'detail'] as const,
    detail: (id: string) => [...responseKeys.details(), id] as const,
} as const;
