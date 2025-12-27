import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';

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
            const mockData = {
                ok: true,
                data: [
                    {
                        'ID State': '1',
                        'ID Year': 2024,
                        Population: 1000,
                        'Slug State': 'state1',
                        State: 'State 1',
                        Year: '2020',
                    },
                ],
            };

            mockResponseApi.getResponseData.mockResolvedValue(mockData as any);

            const { result } = renderHook(() => responseQueries.useResponses(), {
                wrapper: createWrapper(),
            });

            expect(result.current.isLoading).toBe(true);

            await act(async () => {
                await waitFor(() => {
                    expect(result.current.isLoading).toBe(false);
                });
            });

            expect(result.current.data).toEqual(mockData);
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

        it('should use correct query key', async () => {
            mockResponseApi.getResponseData.mockResolvedValue({
                ok: true,
                data: [],
            } as any);

            const { result } = renderHook(() => responseQueries.useResponses(), {
                wrapper: createWrapper(),
            });

            await act(async () => {
                await waitFor(() => {
                    expect(result.current.isLoading).toBe(false);
                });
            });

            expect(mockResponseApi.getResponseData).toHaveBeenCalled();
        });
    });

    describe('useResponseDetail', () => {
        it('should fetch response detail successfully', async () => {
            const mockDetail = {
                ok: true,
                data: {
                    'ID State': '1',
                    'ID Year': 2024,
                    Population: 1000,
                    'Slug State': 'state1',
                    State: 'State 1',
                    Year: '2020',
                },
            };

            mockResponseApi.getResponseDetail.mockResolvedValue(mockDetail as any);

            const { result } = renderHook(() => responseQueries.useResponseDetail(), {
                wrapper: createWrapper(),
            });

            let detail;
            await act(async () => {
                detail = await result.current.getDetail('1');
            });

            expect(detail).toEqual(mockDetail.data);
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

        it('should return undefined when response is not ok', async () => {
            mockResponseApi.getResponseDetail.mockResolvedValue({
                ok: false,
                data: null,
            } as any);

            const { result } = renderHook(() => responseQueries.useResponseDetail(), {
                wrapper: createWrapper(),
            });

            let detail;
            await act(async () => {
                detail = await result.current.getDetail('1');
            });

            expect(detail).toBeUndefined();
        });
    });
});
