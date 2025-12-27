import queries from '@/data/queries';

export const useResponse = () => {
    const { isLoading, error, data } = queries.responseQueries.useResponses();

    const response = data?.ok && data?.data ? data.data : [];

    return {
        response,
        isLoading,
        error,
        data,
    };
};
