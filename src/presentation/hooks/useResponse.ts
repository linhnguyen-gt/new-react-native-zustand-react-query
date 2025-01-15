import { useQuery } from "@tanstack/react-query";
import React from "react";

import { useResponseStore } from "@/app/store";
import { ResponseUseCase } from "@/core";
import { ResponseRepository } from "@/data";

export const useResponse = () => {
    const { response, setResponse } = useResponseStore();
    const responseRepository = new ResponseRepository();
    const responseUseCase = new ResponseUseCase(responseRepository);

    const { data, isLoading, error } = useQuery({
        queryKey: ["response-data"],
        queryFn: () => responseUseCase.execute()
    });

    React.useEffect(() => {
        if (data?.ok) {
            setResponse(data.data);
        }
    }, [data, setResponse]);

    return {
        response,
        isLoading,
        error,
        data: data
    };
};
