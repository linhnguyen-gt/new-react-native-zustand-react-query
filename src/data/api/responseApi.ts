import { ApiMethod, HttpClient } from '../services/httpClient';

export const responseApi = {
    getResponseData: async (): Promise<BaseResponse<ResponseData[]>> => {
        const response = await HttpClient.request<ResponseData[]>({
            endpoint: 'posts',
            method: ApiMethod.GET,
        });

        if (!response?.ok) {
            return;
        }

        return { ok: response.ok, data: response.data };
    },

    getResponseDetail: async (id: string): Promise<BaseResponse<ResponseData>> => {
        const response = await HttpClient.request<ResponseData>({
            endpoint: `posts/${id}`,
            method: ApiMethod.GET,
        });

        if (!response?.ok) {
            return;
        }

        return { ok: response.ok, data: response.data };
    },
};
