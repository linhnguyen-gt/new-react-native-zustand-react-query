import { useResponseStore } from "@/app/store";
import { useResponsesQuery } from "@/data/queries";

export const useResponse = () => {
    const { response } = useResponseStore();
    const { isLoading, error, data } = useResponsesQuery();

    return {
        response,
        isLoading,
        error,
        data
    };
};
