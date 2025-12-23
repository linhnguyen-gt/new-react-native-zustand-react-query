import { useMutation, useQuery } from '@tanstack/react-query';
import React from 'react';

import store from '@/app/store';
import { Logger } from '@/shared/helper';

import { responseApi } from '../api';

const responseQueries = {
    useResponses: () => {
        const { setResponse } = store.useResponseStore();

        const result = useQuery({
            queryKey: ['responses', 'list'],
            queryFn: responseApi.getResponseData,
        });

        React.useEffect(() => {
            if (result.data?.ok) {
                setResponse(result.data.data ?? []);
            }
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [result.data]);

        return result;
    },

    useResponseDetail: () => {
        const { setResponseDetail } = store.useResponseStore();

        const mutation = useMutation({
            mutationFn: responseApi.getResponseDetail,
            onSuccess: (data) => {
                if (data?.ok) {
                    setResponseDetail(data.data);
                }
            },
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
