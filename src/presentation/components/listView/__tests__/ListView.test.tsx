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

        it('keeps the real data when loading without a skeleton component', () => {
            // Without a skeletonComponent, skeletonRenderItem draws nothing, so feeding
            // FlashList a dummy array handed it `skeletonCount` rows of zero height. It
            // builds its layout model from those and never recovers once the real data
            // arrives — measured on device as all 100 rows mounted and none recycled.
            const props = { ...defaultProps, isLoading: true, skeletonComponent: undefined };

            render(<ListView {...props} />);

            const flashListCall = mockFlashList.FlashList.mock.calls[0][0];
            expect(flashListCall.data).toBe(props.data);
            expect(flashListCall.renderItem).toBe(props.renderItem);
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

describe('ListView keyExtractor', () => {
    /** Pulls the keyExtractor FlashList was rendered with. */
    const capturedKeyExtractor = () => {
        const calls = mockFlashList.FlashList.mock.calls;
        return calls[calls.length - 1][0].keyExtractor as (item: unknown, index: number) => string;
    };

    beforeEach(() => {
        mockFlashList.FlashList.mockClear();
    });

    it('produces a stable key across renders even when the key field is missing', () => {
        const { rerender } = render(<ListView {...defaultProps} />);
        const first = capturedKeyExtractor()({ id: undefined }, 0);

        rerender(<ListView {...defaultProps} />);
        const second = capturedKeyExtractor()({ id: undefined }, 0);

        // The old fallback used Math.random(), so a row whose key field was missing
        // got a new key every render and FlashList remounted it each pass, losing
        // scroll position and any row-local state.
        expect(first).toBe(second);
    });

    it('treats an id of 0 as a real key, not a missing one', () => {
        render(<ListView {...defaultProps} />);

        // `0` is falsy, so a truthiness check sent a perfectly ordinary id down the
        // fallback path.
        expect(capturedKeyExtractor()({ id: 0 }, 3)).toBe('0');
    });

    it('falls back to the index, never to a random value', () => {
        const { rerender } = render(<ListView {...defaultProps} />);
        const first = capturedKeyExtractor()({}, 7);

        rerender(<ListView {...defaultProps} />);
        const second = capturedKeyExtractor()({}, 7);

        expect(first).toBe('item-7');
        expect(second).toBe('item-7');
    });
});
