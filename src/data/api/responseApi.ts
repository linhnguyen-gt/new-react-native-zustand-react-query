import { ApiMethod, HttpClient } from '../services/httpClient';

export const responseApi = {
    /**
     * @param signal forwarded from React Query so navigating away actually aborts the
     * request instead of leaving it running and discarding the response.
     */
    getResponseData: async (signal?: AbortSignal): Promise<BaseResponse<ResponseData[]>> => {
        const response = await HttpClient.request<ResponseData[]>({
            endpoint: 'posts',
            method: ApiMethod.GET,
            signal,
        });

        // `ok: true` literally, not forwarded from the response: reaching this line
        // means the request resolved. `HttpClient.request` throws on failure, so
        // there is no falsy case to propagate.
        return { ok: true, data: response.data };
    },

    getResponseDetail: async (id: string): Promise<BaseResponse<ResponseData>> => {
        const response = await HttpClient.request<ResponseData>({
            endpoint: `posts/${id}`,
            method: ApiMethod.GET,
        });

        // `ok: true` literally, not forwarded from the response: reaching this line
        // means the request resolved. `HttpClient.request` throws on failure, so
        // there is no falsy case to propagate.
        return { ok: true, data: response.data };
    },
};
