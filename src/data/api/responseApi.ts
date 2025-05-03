import { ApiMethod, HttpClient } from "../services/httpClient";

import { ResponseData } from "@/shared/models";

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
    }
};
