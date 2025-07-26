import { useResponseStore } from '@/app/store';

import { useResponsesQueries } from '@/data/queries';

export const useResponse = () => {
    const { response } = useResponseStore();
    const { isLoading, error, data } = useResponsesQueries();

    return {
        response,
        isLoading,
        error,
        data,
    };
};
