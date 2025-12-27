import { useMutation, useQuery } from '@tanstack/react-query';

import { Logger } from '@/shared/helper';

import { responseApi } from '../api';

const responseQueries = {
    useResponses: () => {
        return useQuery({
            queryKey: ['responses', 'list'],
            queryFn: responseApi.getResponseData,
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
