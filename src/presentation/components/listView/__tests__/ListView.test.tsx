import { render } from '@testing-library/react-native';
import React from 'react';

import { Text } from '../../ui';
import ListView from '../ListView';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockFlashList = require('@shopify/flash-list');

jest.mock('@shopify/flash-list', () => ({
    FlashList: jest.fn(({ children, ...props }) => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const MockedFlatList = require('react-native').FlatList;
        return <MockedFlatList {...props}>{children}</MockedFlatList>;
    }),
}));

jest.mock('../../../hooks', () => ({
    useRefresh: jest.fn(() => [false, jest.fn()]),
}));

jest.mock('../../loading/LoadingFooter', () => {
    return jest.fn(() => null);
});

type TestItem = {
    id: string;
    name: string;
    value: number;
};

const mockData: TestItem[] = [
    { id: '1', name: 'Item 1', value: 10 },
    { id: '2', name: 'Item 2', value: 20 },
    { id: '3', name: 'Item 3', value: 30 },
];

const mockRenderItem = ({ item }: { item: TestItem }) => <Text testID={`item-${item.id}`}>{item.name}</Text>;

const defaultProps = {
    data: mockData,
    renderItem: mockRenderItem,
    keyList: 'id' as keyof TestItem,
};

describe('ListView', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Basic Rendering', () => {
        it('renders with data correctly', () => {
            const { getByTestId } = render(<ListView {...defaultProps} />);

            expect(getByTestId('item-1')).toBeTruthy();
            expect(getByTestId('item-2')).toBeTruthy();
            expect(getByTestId('item-3')).toBeTruthy();
        });

        it('renders with empty data when data is undefined', () => {
            const props = { ...defaultProps, data: undefined };
            const { queryByTestId } = render(<ListView {...props} />);

            expect(queryByTestId('item-1')).toBeNull();
        });

        it('renders with empty data when data is empty array', () => {
            const props = { ...defaultProps, data: [] };
            const { queryByTestId } = render(<ListView {...props} />);

            expect(queryByTestId('item-1')).toBeNull();
        });
    });

    describe('Loading State', () => {
        it('shows skeleton items when loading', () => {
            const props = {
                ...defaultProps,
                isLoading: true,
                skeletonComponent: () => <Text testID="skeleton-item">Loading...</Text>,
            };

            const { getAllByTestId } = render(<ListView {...props} />);

            expect(getAllByTestId('skeleton-item')).toHaveLength(10);
        });

        it('disables scroll when loading', () => {
            const props = { ...defaultProps, isLoading: true };

            render(<ListView {...props} />);

            const flashListCall = mockFlashList.FlashList.mock.calls[0][0];
            expect(flashListCall.scrollEnabled).toBe(false);
        });
    });

    describe('Pull to Refresh', () => {
        it('shows refresh control when onPullToRefresh is provided', () => {
            const props = {
                ...defaultProps,
                onPullToRefresh: jest.fn(),
            };

            render(<ListView {...props} />);

            const flashListCall = mockFlashList.FlashList.mock.calls[0][0];
            expect(flashListCall.refreshControl).toBeTruthy();
        });

        it('does not show refresh control when onPullToRefresh is not provided', () => {
            const props = { ...defaultProps };

            render(<ListView {...props} />);

            const flashListCall = mockFlashList.FlashList.mock.calls[0][0];
            expect(flashListCall.refreshControl).toBeUndefined();
        });
    });

    describe('Load More', () => {
        it('calls onPressLoadMore when end is reached', () => {
            const mockOnPressLoadMore = jest.fn();
            const props = {
                ...defaultProps,
                onPressLoadMore: mockOnPressLoadMore,
            };

            render(<ListView {...props} />);

            const flashListCall = mockFlashList.FlashList.mock.calls[0][0];
            expect(flashListCall.onEndReached).toBe(mockOnPressLoadMore);
        });
    });

    describe('List Configuration', () => {
        it('applies horizontal configuration', () => {
            const props = { ...defaultProps, horizontal: true };

            render(<ListView {...props} />);

            const flashListCall = mockFlashList.FlashList.mock.calls[0][0];
            expect(flashListCall.horizontal).toBe(true);
        });

        it('applies numColumns configuration', () => {
            const props = { ...defaultProps, numColumns: 2 };

            render(<ListView {...props} />);

            const flashListCall = mockFlashList.FlashList.mock.calls[0][0];
            expect(flashListCall.numColumns).toBe(2);
        });

        it('applies scroll indicator configuration', () => {
            const props = {
                ...defaultProps,
                showsHorizontalScrollIndicator: true,
                showsVerticalScrollIndicator: false,
            };

            render(<ListView {...props} />);

            const flashListCall = mockFlashList.FlashList.mock.calls[0][0];
            expect(flashListCall.showsHorizontalScrollIndicator).toBe(true);
            expect(flashListCall.showsVerticalScrollIndicator).toBe(false);
        });

        it('applies padding configuration', () => {
            const props = {
                ...defaultProps,
                pt: 20,
                pb: 30,
            };

            render(<ListView {...props} />);

            const flashListCall = mockFlashList.FlashList.mock.calls[0][0];
            expect(flashListCall.contentContainerStyle).toEqual({
                paddingTop: 20,
                paddingBottom: 30,
            });
        });

        it('uses default padding bottom when not provided', () => {
            const props = { ...defaultProps };

            render(<ListView {...props} />);

            const flashListCall = mockFlashList.FlashList.mock.calls[0][0];
            expect(flashListCall.contentContainerStyle).toEqual({
                paddingBottom: 100,
                paddingTop: undefined,
            });
        });
    });

    describe('Key Extraction', () => {
        it('extracts keys correctly for normal data', () => {
            const props = { ...defaultProps };

            render(<ListView {...props} />);

            const flashListCall = mockFlashList.FlashList.mock.calls[0][0];
            expect(flashListCall.keyExtractor).toBeInstanceOf(Function);
        });
    });

    describe('List Header Component', () => {
        it('renders header component when provided', () => {
            const headerComponent = () => <Text testID="header">Header</Text>;
            const props = {
                ...defaultProps,
                listHeaderComponent: headerComponent,
            };

            const { getByTestId } = render(<ListView {...props} />);

            expect(getByTestId('header')).toBeTruthy();
        });
    });

    describe('Ref Forwarding', () => {
        it('forwards ref correctly', () => {
            const ref = React.createRef<any>();
            const props = { ...defaultProps };

            render(<ListView {...props} ref={ref} />);

            const flashListCall = mockFlashList.FlashList.mock.calls[0][0];
            expect(flashListCall.ref).toBe(ref);
        });
    });

    describe('Performance', () => {
        it('uses onEndReachedThreshold of 0.1', () => {
            const props = { ...defaultProps };

            render(<ListView {...props} />);

            const flashListCall = mockFlashList.FlashList.mock.calls[0][0];
            expect(flashListCall.onEndReachedThreshold).toBe(0.1);
        });
    });
});
