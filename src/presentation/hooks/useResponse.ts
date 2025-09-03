import store from '@/app/store';

import queries from '@/data/queries';

export const useResponse = () => {
    const { response } = store.useResponseStore();
    const { isLoading, error, data } = queries.responseQueries.useResponses();

    return {
        response,
        isLoading,
        error,
        data,
    };
};
