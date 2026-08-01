import { queryOptions, useMutation, useQuery } from '@tanstack/react-query';

import { Logger } from '@/shared/helper';

import { responseApi } from '../api';

import { responseKeys } from './responseKeys';

/**
 * The list query as data, not as a hook.
 *
 * `queryOptions()` ties key, fetcher and result type together in one value, so the same
 * definition drives `useQuery`, `queryClient.prefetchQuery`, `ensureQueryData` and
 * `setQueryData` without any of them restating the key. Previously the key existed only
 * inside the `useQuery` call, which meant a prefetch or an invalidation had to
 * re-type `['responses', 'list']` and hope.
 */
export const responseListQuery = () =>
    queryOptions({
        queryKey: responseKeys.lists(),
        // Destructured rather than passing the function reference directly: React Query
        // calls queryFn with a context object, so `responseApi.getResponseData` received
        // that object as its first argument and the signal was never seen.
        queryFn: ({ signal }) => responseApi.getResponseData(signal),
    });

const responseQueries = {
    useResponses: () => useQuery(responseListQuery()),

    useResponseDetail: () => {
        const mutation = useMutation({
            mutationKey: responseKeys.details(),
            mutationFn: responseApi.getResponseDetail,
        });

        const getDetail = async (detailId: string) => {
            try {
                // Returned directly. This used to be `if (result?.ok) return result.data`,
                // a branch on the `BaseResponse` envelope — so a successful fetch whose
                // envelope said otherwise returned `undefined` instead of throwing. The
                // envelope is gone; `mutateAsync` either resolves with the parsed post or
                // rejects.
                return await mutation.mutateAsync(detailId);
            } catch (error) {
                Logger.error('ResponseQueries', 'Failed to fetch detail', error);
                throw error;
            }
        };

        return {
            data: mutation.data,
            isLoading: mutation.isPending,
            error: mutation.error,
            getDetail,
        };
    },
};

export default responseQueries;
