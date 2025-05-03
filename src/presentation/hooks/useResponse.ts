import { useQuery } from "@tanstack/react-query";
import React from "react";

import { useResponseStore } from "@/app/store";
import { responseApi } from "@/data/api";

export const useResponse = () => {
    const { response, setResponse } = useResponseStore();

    const { data, isLoading, error } = useQuery({
        queryKey: ["response-data"],
        queryFn: responseApi.getResponseData
    });

    React.useEffect(() => {
        if (data?.ok) {
            setResponse(data?.data ?? []);
        }
    }, [data, setResponse]);

    return {
        response,
        isLoading,
        error,
        data
    };
};
