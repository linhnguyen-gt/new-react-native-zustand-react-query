import queries from '@/data/queries';
import type { ResponseData } from '@/shared/models';

/**
 * Shared empty result.
 *
 * Returning a fresh `[]` on every render broke referential equality for every downstream
 * memo and effect dependency — a list that is empty while loading looked like a new list
 * on each pass.
 */
const EMPTY_RESPONSE: ResponseData[] = [];

export const useResponse = () => {
    const { isLoading, error, data, refetch } = queries.responseQueries.useResponses();

    // `data ?? EMPTY_RESPONSE`, not `data?.ok && data?.data`. The old expression branched
    // on a `BaseResponse` envelope whose `ok` was hardcoded `true` at the only site that
    // produced it, so the falsy arm was unreachable — a dead check that read like a live
    // one. The API now returns the parsed array or throws.
    const response = data ?? EMPTY_RESPONSE;

    return {
        response,
        isLoading,
        error,
        data,
        /** Exposed so a list can drive pull-to-refresh; `useRefresh` awaits the promise. */
        refetch,
    };
};
