import { useMutation, useQuery } from "@tanstack/react-query";
import React from "react";

import { useResponseStore } from "@/app/store";

import { responseApi } from "@/data/api";

import { queryKeys } from "./queryKeys";

export const useResponsesQueries = () => {
    const { setResponse } = useResponseStore();

    const result = useQuery({
        queryKey: queryKeys.responses.list(),
        queryFn: responseApi.getResponseData
    });

    React.useEffect(() => {
        if (result.data?.ok) {
            setResponse(result.data.data ?? []);
        }
    }, [result.data, setResponse]);

    return result;
};

export const useResponseDetailQueries = () => {
    const { setResponseDetail } = useResponseStore();

    const mutation = useMutation({
        mutationFn: responseApi.getResponseDetail,
        onSuccess: (data) => {
            if (data?.ok) {
                setResponseDetail(data.data);
            }
        }
    });

    const getDetail = async (detailId: string) => {
        try {
            const result = await mutation.mutateAsync(detailId);
            if (result?.ok) {
                result.data;
            }
        } catch (error) {
            console.error("Failed to fetch detail:", error);
        }
    };

    return {
        data: mutation.data,
        isLoading: mutation.isPending,
        error: mutation.error,
        getDetail
    };
};
