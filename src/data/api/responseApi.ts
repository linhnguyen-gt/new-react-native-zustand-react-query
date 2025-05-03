import { ApiMethod, HttpClient } from "../services/httpClient";

export const responseApi = {
    getResponseData: async (): Promise<BaseResponse<ResponseData[]>> => {
        const response = await HttpClient.request<{
            data: ResponseData[];
        }>({
            endpoint: "data",
            method: ApiMethod.GET,
            params: {
                drilldowns: "State",
                measures: "Population",
                year: "latest"
            }
        });

        if (!response?.ok) return;

        return { ok: response.ok, data: response.data?.data };
    },

    getResponseDetail: async (id: string): Promise<BaseResponse<ResponseData>> => {
        const response = await HttpClient.request<{
            data: ResponseData;
        }>({
            endpoint: `data/${id}`,
            method: ApiMethod.GET
        });

        if (!response?.ok) return;

        return { ok: response.ok, data: response.data?.data };
    }
};
