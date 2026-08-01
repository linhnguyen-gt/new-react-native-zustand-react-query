import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';

import type { ResponseData } from '@/shared/models';

import { responseKeys } from '../responseKeys';
import responseQueries from '../responseQueries';

// Mock the API module
jest.mock('@/data/api', () => ({
    responseApi: {
        getResponseData: jest.fn(),
        getResponseDetail: jest.fn(),
    },
}));

import { responseApi } from '@/data/api';

const mockResponseApi = responseApi as jest.Mocked<typeof responseApi>;

/**
 * Fixtures now match `ResponseSchema` — the shape the API layer actually validates.
 *
 * They used to be census rows (`'ID State'`, `Population`, …) wrapped in a
 * `{ ok, data }` envelope, matching neither the schema the app declares nor the payload
 * the endpoint returns. The envelope is gone and the API parses with zod, so a fixture
 * that lies about the shape is a test that proves nothing.
 */
const post: ResponseData = {
    userId: 1,
    id: 1,
    title: 'A post',
    body: 'Body text',
};

// Create a wrapper with QueryClientProvider
const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });

    return ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('responseQueries', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('useResponses', () => {
        it('should fetch responses successfully', async () => {
            mockResponseApi.getResponseData.mockResolvedValue([post]);

            const { result } = renderHook(() => responseQueries.useResponses(), {
                wrapper: createWrapper(),
            });

            expect(result.current.isLoading).toBe(true);

            await act(async () => {
                await waitFor(() => {
                    expect(result.current.isLoading).toBe(false);
                });
            });

            // The array itself, not `{ ok, data }`.
            expect(result.current.data).toEqual([post]);
            expect(result.current.error).toBeNull();
        });

        it('should handle fetch error', async () => {
            const mockError = new Error('Failed to fetch');
            mockResponseApi.getResponseData.mockRejectedValue(mockError);

            const { result } = renderHook(() => responseQueries.useResponses(), {
                wrapper: createWrapper(),
            });

            await act(async () => {
                await waitFor(() => {
                    expect(result.current.isLoading).toBe(false);
                });
            });

            expect(result.current.error).toBeDefined();
        });

        it('registers under the key factory, not an inline literal', async () => {
            mockResponseApi.getResponseData.mockResolvedValue([]);

            const queryClient = new QueryClient({
                defaultOptions: { queries: { retry: false } },
            });
            const wrapper = ({ children }: { children: React.ReactNode }) =>
                React.createElement(QueryClientProvider, { client: queryClient }, children);

            const { result } = renderHook(() => responseQueries.useResponses(), { wrapper });

            await act(async () => {
                await waitFor(() => {
                    expect(result.current.isLoading).toBe(false);
                });
            });

            // The point of the factory: an invalidation written against `responseKeys`
            // reaches the cache entry the hook created. Reading it back through the same
            // key is the cheapest proof the two agree.
            expect(queryClient.getQueryData(responseKeys.lists())).toEqual([]);
            expect(mockResponseApi.getResponseData).toHaveBeenCalled();
        });
    });

    describe('useResponseDetail', () => {
        it('should fetch response detail successfully', async () => {
            mockResponseApi.getResponseDetail.mockResolvedValue(post);

            const { result } = renderHook(() => responseQueries.useResponseDetail(), {
                wrapper: createWrapper(),
            });

            let detail;
            await act(async () => {
                detail = await result.current.getDetail('1');
            });

            expect(detail).toEqual(post);
            expect(mockResponseApi.getResponseDetail).toHaveBeenCalled();
        });

        it('should handle detail fetch error', async () => {
            const mockError = new Error('Failed to fetch detail');
            mockResponseApi.getResponseDetail.mockRejectedValue(mockError);

            const { result } = renderHook(() => responseQueries.useResponseDetail(), {
                wrapper: createWrapper(),
            });

            await expect(
                act(async () => {
                    await result.current.getDetail('1');
                })
            ).rejects.toThrow('Failed to fetch detail');
        });

        // Replaces "should return undefined when response is not ok".
        //
        // That test asserted the behaviour of the `BaseResponse` envelope's falsy arm — a
        // branch nothing could ever take, since `ok` was hardcoded `true` at both sites
        // that produced it. It documented dead code as if it were a contract. A failure
        // now arrives as a rejection, which is the only way it ever actually arrived.
        it('rejects rather than resolving undefined when the fetch fails', async () => {
            mockResponseApi.getResponseDetail.mockRejectedValue(new Error('not found'));

            const { result } = renderHook(() => responseQueries.useResponseDetail(), {
                wrapper: createWrapper(),
            });

            await expect(
                act(async () => {
                    await result.current.getDetail('1');
                })
            ).rejects.toThrow('not found');
        });
    });
});
