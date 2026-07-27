import queries from '@/data/queries';

/**
 * Shared empty result.
 *
 * Returning a fresh `[]` on every render broke referential equality for every
 * downstream memo and effect dependency — a list that is empty while loading looked
 * like a new list on each pass.
 */
const EMPTY_RESPONSE: ResponseData[] = [];

export const useResponse = () => {
    const { isLoading, error, data } = queries.responseQueries.useResponses();

    const response = data?.ok && data?.data ? data.data : EMPTY_RESPONSE;

    return {
        response,
        isLoading,
        error,
        data,
    };
};
