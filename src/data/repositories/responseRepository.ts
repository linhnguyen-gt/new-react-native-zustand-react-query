import { ApiMethod, HttpClient } from "../services/httpClient";

import { IResponseRepository } from "@/core";

export class ResponseRepository implements IResponseRepository {
    async getResponse(): Promise<BaseResponse<ResponseData[]>> {
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
    }
}
