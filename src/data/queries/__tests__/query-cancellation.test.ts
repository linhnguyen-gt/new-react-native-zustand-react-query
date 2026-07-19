import { responseApi } from '@/data/api/responseApi';
import { HttpClient } from '@/data/services/httpClient';

jest.mock('@/data/services/httpClient', () => ({
    ...jest.requireActual('@/data/services/httpClient'),
    HttpClient: { request: jest.fn(async () => ({ data: [], status: 200 })) },
}));

/**
 * Pins that React Query's AbortSignal reaches the HTTP client.
 *
 * `queryFn` must destructure the context — `queryFn: responseApi.getResponseData` would
 * hand the whole `QueryFunctionContext` object in as the first argument. That used to be
 * merely useless, because nothing downstream read it; now the argument reaches axios as
 * `config.signal`, where `.aborted` and `addEventListener` are called on it.
 *
 * Typing `getResponseData(signal?: AbortSignal)` means `tsc` rejects that mistake
 * outright — verified by reverting it. These tests cover the half the compiler cannot:
 * that the signal actually arrives at the request rather than being accepted and
 * dropped somewhere in between.
 */
describe('query cancellation plumbing', () => {
    const mockedRequest = HttpClient.request as jest.Mock;

    beforeEach(() => {
        mockedRequest.mockClear();
    });

    it('passes the signal through to the request', async () => {
        const controller = new AbortController();

        await responseApi.getResponseData(controller.signal);

        expect(mockedRequest).toHaveBeenCalledWith(expect.objectContaining({ signal: controller.signal }));
    });

    it('is callable without one, so a non-React-Query caller still works', async () => {
        await responseApi.getResponseData();

        expect(mockedRequest).toHaveBeenCalledWith(expect.objectContaining({ signal: undefined }));
    });

    it('forwards a real AbortSignal rather than a query context object', async () => {
        // The regression this guards: passing the function reference directly makes the
        // first argument a `{ queryKey, signal, meta }` object, which is truthy and
        // therefore easy to miss.
        const controller = new AbortController();

        await responseApi.getResponseData(controller.signal);

        const [config] = mockedRequest.mock.calls[0];
        expect(config.signal).toBeInstanceOf(AbortSignal);
    });
});
