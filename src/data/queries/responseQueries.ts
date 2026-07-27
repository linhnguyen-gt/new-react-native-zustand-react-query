import { useMutation, useQuery } from '@tanstack/react-query';

import { Logger } from '@/shared/helper';

import { responseApi } from '../api';

const responseQueries = {
    useResponses: () => {
        return useQuery({
            queryKey: ['responses', 'list'],
            // Destructured rather than passing the function reference directly: React
            // Query calls queryFn with a context object, so `responseApi.getResponseData`
            // received that object as its first argument and the signal was never seen.
            queryFn: ({ signal }) => responseApi.getResponseData(signal),
        });
    },

    useResponseDetail: () => {
        const mutation = useMutation({
            mutationFn: responseApi.getResponseDetail,
        });

        const getDetail = async (detailId: string) => {
            try {
                const result = await mutation.mutateAsync(detailId);
                if (result?.ok) {
                    return result.data;
                }
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
