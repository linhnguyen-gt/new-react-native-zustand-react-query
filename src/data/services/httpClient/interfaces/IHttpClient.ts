import { AxiosRequestConfig } from "axios";

import ApiMethod from "../ApiMethod";

export interface IHttpClient {
    request<
        Data extends Record<string, any>,
        Method extends ApiMethod,
        Body = Record<string, any>,
        Params = Record<string, any>
    >(
        endpoint: string,
        apiConfig: ApiClientConfig<Body, Params, Method>,
        config?: AxiosRequestConfig
    ): Promise<BaseResponse<Data>>;

    updateHeaders(newHeaders: Record<string, string>): void;
}
