import { ApiMethod, HttpClient } from "@/services";

export const responseApi = async (): Promise<BaseResponse<ResponseData[]>> => {
    const response = await HttpClient.request<
        {
            data: ResponseData[];
        },
        ApiMethod.GET
    >("data", {
        method: ApiMethod.GET,
        params: {
            drilldowns: "State",
            measures: "Population",
            year: "latest"
        }
    });

    if (!response?.ok) return;

    return { ok: response.ok, data: response.data.data };
};
