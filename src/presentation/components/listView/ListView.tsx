import { FlashList, FlashListProps, FlashListRef, ListRenderItem } from '@shopify/flash-list';
import React from 'react';
import { DimensionValue, RefreshControl } from 'react-native';

import { useRefresh } from '../../hooks';
import { LoadingFooter } from '../loading';

type Data = Record<string, any>;

export type ListViewRef<T> = FlashListRef<T>;

type ListViewProps<T> = FlashListProps<T> & {
    data: T[] | undefined;
    renderItem: ListRenderItem<T> | null | undefined;
    numColumns?: number;
    onPullToRefresh?: (() => void) | undefined;
    onPressLoadMore?: () => void;
    listHeaderComponent?: React.ComponentType | React.ReactElement | null | undefined;
    horizontal?: boolean;
    showsHorizontalScrollIndicator?: boolean;
    showsVerticalScrollIndicator?: boolean;
    pt?: DimensionValue;
    keyList: keyof T;
    isLoadingMore?: boolean;
    pb?: DimensionValue;
    isLoading?: boolean;
    skeletonCount?: number;
    skeletonComponent?: React.ComponentType;
    emptyComponent?: React.ComponentType | React.ReactElement | null | undefined;
};

function ListView<T extends Data>(
    {
        data,
        renderItem,
        numColumns,
        onPullToRefresh,
        onPressLoadMore,
        listHeaderComponent,
        horizontal,
        showsHorizontalScrollIndicator = false,
        showsVerticalScrollIndicator = false,
        pt,
        isLoadingMore,
        keyList,
        pb = 100,
        isLoading,
        skeletonCount = 15,
        skeletonComponent,
        emptyComponent,
        ...rest
    }: ListViewProps<T>,
    ref: React.ForwardedRef<ListViewRef<T>>
) {
    const [isRefreshing, onRefresh] = useRefresh(onPullToRefresh);

    const _refreshControl = React.useMemo(
        () =>
            onPullToRefresh &&
            !isLoading && <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="black" />,
        [isRefreshing, onPullToRefresh, onRefresh, isLoading]
    );

    const _renderLoadingLoadMore = React.useMemo(() => <LoadingFooter isLoading={isLoadingMore} />, [isLoadingMore]);

    /**
     * Skeletons are only fed to the list when there is something to draw for them.
     *
     * `skeletonRenderItem` returns `null` when no `skeletonComponent` was supplied, so the
     * loading pass used to hand FlashList `skeletonCount` rows of zero height. FlashList
     * builds its layout model from those measurements and does not recover when the real
     * data swaps in: every row is then treated as if it costs nothing, the whole list fits
     * the viewport by that model, and nothing is virtualised.
     *
     * Measured on device with a mount probe in the row component — 100 posts, no scrolling:
     *
     *   zero-height skeletons -> real data   100 mounts, 0 unmounts
     *   sized skeletons       -> real data     7 mounts
     *   no skeleton pass at all                6 mounts
     *
     * Callers that pass no `skeletonComponent` (the `main` screen is one) now keep their
     * real data throughout and rely on their own loading indicator.
     */
    const showSkeletons = Boolean(isLoading && skeletonComponent);

    const dummyArray = React.useMemo(() => {
        return Array(skeletonCount)
            .fill(null)
            .map((_, index) => ({
                [keyList]: `skeleton-${index}-${Math.random().toString(36).substring(2, 9)}`,
            })) as T[];
    }, [skeletonCount, keyList]);

    const skeletonRenderItem: ListRenderItem<T> = React.useCallback(() => {
        const SkeletonComponent = skeletonComponent;
        return SkeletonComponent ? <SkeletonComponent /> : null;
    }, [skeletonComponent]);

    const _keyExtractor = React.useCallback(
        (item: T, index: number) => {
            const key = item[keyList];

            // `!= null` rather than a truthiness test: `0` is a perfectly ordinary id
            // and would otherwise fall through to the fallback.
            if (key != null) {
                return String(key);
            }

            // Falls back to the index, never Math.random(). A random key changes on
            // every render, so FlashList tears the row down and remounts it each pass,
            // losing scroll position and any state the row holds.
            return `item-${index}`;
        },
        [keyList]
    );

    const _renderEmpty = React.useCallback(() => {
        if (React.isValidElement(emptyComponent)) {
            return emptyComponent;
        }
        const EmptyComponent = emptyComponent as React.ComponentType;
        return EmptyComponent ? <EmptyComponent /> : null;
    }, [emptyComponent]);

    // Not wrapped in useMemo. `rest` is a fresh object on every render, so a memo
    // listing it as a dependency never hits — it only paid for a 19-entry dependency
    // comparison and then rebuilt the element anyway.
    //
    // `{...rest}` is spread first on purpose: everything written below it is owned by
    // ListView and wins. A caller passing `ListFooterComponent`, `keyExtractor`,
    // `data`, `renderItem` or `contentContainerStyle` will find it silently ignored —
    // use the dedicated props (`pt`/`pb`/`emptyComponent`/…) instead.
    return (
        <FlashList
            ref={ref}
            {...rest}
            horizontal={horizontal}
            showsVerticalScrollIndicator={showsVerticalScrollIndicator}
            showsHorizontalScrollIndicator={showsHorizontalScrollIndicator}
            ListHeaderComponent={listHeaderComponent}
            ListFooterComponent={_renderLoadingLoadMore}
            ListEmptyComponent={!isLoading ? _renderEmpty : null}
            refreshControl={_refreshControl || undefined}
            onEndReached={onPressLoadMore}
            keyExtractor={_keyExtractor}
            data={showSkeletons ? dummyArray : data}
            renderItem={showSkeletons ? skeletonRenderItem : renderItem}
            numColumns={numColumns}
            contentContainerStyle={{
                paddingTop: pt,
                paddingBottom: pb,
            }}
            onEndReachedThreshold={0.1}
            scrollEnabled={!isLoading}
        />
    );
}

const ForwardedListView = React.memo(React.forwardRef(ListView)) as unknown as <T extends Data>(
    props: ListViewProps<T> & { ref?: React.ForwardedRef<ListViewRef<T>> }
) => React.ReactElement;

export default ForwardedListView;
