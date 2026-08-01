import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';

import { responseApi } from '@/data/api/responseApi';
import type { ResponseData } from '@/shared/models';

import { useResponse } from '../useResponse';

// Mock the API
jest.mock('@/data/api/responseApi');

const mockResponseApi = responseApi as jest.Mocked<typeof responseApi>;

/**
 * Fixtures match `ResponseSchema`.
 *
 * They were census rows wrapped in a `{ ok, data }` envelope — a shape neither the schema
 * nor the endpoint ever produced. The envelope is gone and the API parses with zod, so
 * the fixture has to be something that would survive parsing.
 */
const posts: ResponseData[] = [
    { userId: 1, id: 1, title: 'First', body: 'First body' },
    { userId: 1, id: 2, title: 'Second', body: 'Second body' },
];

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

describe('useResponse', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return empty response initially', () => {
        mockResponseApi.getResponseData.mockResolvedValue([]);

        const { result } = renderHook(() => useResponse(), {
            wrapper: createWrapper(),
        });

        expect(result.current.response).toEqual([]);
        expect(result.current.isLoading).toBe(true);
    });

    it('should return response data when loaded', async () => {
        mockResponseApi.getResponseData.mockResolvedValue(posts);

        const { result } = renderHook(() => useResponse(), {
            wrapper: createWrapper(),
        });

        await act(async () => {
            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });
        });

        expect(result.current.response).toEqual(posts);
        expect(result.current.error).toBeNull();
    });

    it('should handle error gracefully', async () => {
        const mockError = new Error('Failed to fetch');
        mockResponseApi.getResponseData.mockRejectedValue(mockError);

        const { result } = renderHook(() => useResponse(), {
            wrapper: createWrapper(),
        });

        await act(async () => {
            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });
        });

        expect(result.current.error).toBeDefined();
        expect(result.current.response).toEqual([]);
    });

    it('returns the same empty array identity while there is no data', async () => {
        mockResponseApi.getResponseData.mockRejectedValue(new Error('offline'));

        const { result, rerender } = renderHook(() => useResponse(), {
            wrapper: createWrapper(),
        });

        const first = result.current.response;
        rerender({});

        // Referential stability is the entire reason `EMPTY_RESPONSE` is hoisted: a fresh
        // `[]` per render invalidates every downstream memo and effect dependency.
        expect(result.current.response).toBe(first);
    });

    it('exposes the raw query data unwrapped', async () => {
        mockResponseApi.getResponseData.mockResolvedValue(posts);

        const { result } = renderHook(() => useResponse(), {
            wrapper: createWrapper(),
        });

        await act(async () => {
            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });
        });

        // `data` is the array itself now — there is no `{ ok, data }` layer between the
        // query and the caller.
        expect(result.current.data).toEqual(posts);
    });

    it('exposes refetch so a list can drive pull-to-refresh', async () => {
        mockResponseApi.getResponseData.mockResolvedValue(posts);

        const { result } = renderHook(() => useResponse(), {
            wrapper: createWrapper(),
        });

        await act(async () => {
            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });
        });

        await act(async () => {
            await result.current.refetch();
        });

        expect(mockResponseApi.getResponseData).toHaveBeenCalledTimes(2);
    });
});
