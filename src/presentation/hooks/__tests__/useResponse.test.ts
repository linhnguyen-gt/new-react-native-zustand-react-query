import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';

import { responseApi } from '@/data/api/responseApi';
import { useResponse } from '../useResponse';

// Mock the API
jest.mock('@/data/api/responseApi');

const mockResponseApi = responseApi as jest.Mocked<typeof responseApi>;

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
        mockResponseApi.getResponseData.mockResolvedValue({
            ok: true,
            data: [],
        } as any);

        const { result } = renderHook(() => useResponse(), {
            wrapper: createWrapper(),
        });

        expect(result.current.response).toEqual([]);
        expect(result.current.isLoading).toBe(true);
    });

    it('should return response data when loaded', async () => {
        const mockData = [
            {
                'ID State': '1',
                'ID Year': 2020,
                Population: 1000,
                'Slug State': 'state1',
                State: 'State 1',
                Year: '2020',
            },
            {
                'ID State': '2',
                'ID Year': 2020,
                Population: 2000,
                'Slug State': 'state2',
                State: 'State 2',
                Year: '2020',
            },
        ];

        mockResponseApi.getResponseData.mockResolvedValue({
            ok: true,
            data: mockData,
        } as any);

        const { result } = renderHook(() => useResponse(), {
            wrapper: createWrapper(),
        });

        await act(async () => {
            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });
        });

        expect(result.current.response).toEqual(mockData);
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

    it('should return empty array when data is null', async () => {
        mockResponseApi.getResponseData.mockResolvedValue({
            ok: true,
            data: null,
        } as any);

        const { result } = renderHook(() => useResponse(), {
            wrapper: createWrapper(),
        });

        await act(async () => {
            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });
        });

        expect(result.current.response).toEqual([]);
    });

    it('should return full data object', async () => {
        const mockFullData = {
            ok: true,
            data: [
                {
                    'ID State': '1',
                    'ID Year': 2020,
                    Population: 1000,
                    'Slug State': 'state1',
                    State: 'State 1',
                    Year: '2020',
                },
            ],
        };

        mockResponseApi.getResponseData.mockResolvedValue(mockFullData as any);

        const { result } = renderHook(() => useResponse(), {
            wrapper: createWrapper(),
        });

        await act(async () => {
            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });
        });

        expect(result.current.data).toEqual(mockFullData);
    });
});
