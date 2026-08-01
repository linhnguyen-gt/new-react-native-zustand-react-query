import { ResponseListSchema, ResponseSchema, type ResponseData } from '@/shared/models';

import { ApiMethod, HttpClient } from '../services/httpClient';

import { parseOrThrow } from './parseResponse';

/**
 * Returns the payload directly — no `BaseResponse` envelope.
 *
 * Both functions used to return `BaseResponse<T>`, a `{ ok, data }` union whose `ok` was
 * hardcoded `true` at the only two sites that produced it. `interfaces/IHttpClient.ts`
 * already argued at length against exactly that shape: `HttpClient.request` throws on
 * failure, so a returned value is *already* proof of success and a flag adds a branch
 * nothing can take. `useResponse` took that branch anyway (`data?.ok && data?.data`) —
 * dead code that reads like a safety check.
 *
 * The envelope also hid a second problem. `HttpResponse.data` is optional, so the old
 * code forwarded a possible `undefined` into a field declared `ResponseData[]`. Parsing
 * closes that hole instead of casting past it.
 */
export const responseApi = {
    /**
     * @param signal forwarded from React Query so navigating away actually aborts the
     * request instead of leaving it running and discarding the response.
     */
    getResponseData: async (signal?: AbortSignal): Promise<ResponseData[]> => {
        const response = await HttpClient.request<unknown>({
            endpoint: 'posts',
            method: ApiMethod.GET,
            signal,
        });

        return parseOrThrow(ResponseListSchema, response.data, 'posts');
    },

    getResponseDetail: async (id: string): Promise<ResponseData> => {
        const response = await HttpClient.request<unknown>({
            endpoint: `posts/${id}`,
            method: ApiMethod.GET,
        });

        return parseOrThrow(ResponseSchema, response.data, `posts/${id}`);
    },
};
