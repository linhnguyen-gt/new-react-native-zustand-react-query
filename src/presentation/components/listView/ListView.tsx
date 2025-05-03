import { FlashList, FlashListProps, ListRenderItem } from "@shopify/flash-list";
import React from "react";
import { DimensionValue, RefreshControl } from "react-native";

import { LoadingFooter } from "../loading";

import { useRefresh } from "@/presentation/hooks";

type Data = Record<string, any>;

export type ListViewRef<T> = FlashList<T>;

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

    const dummyArray = React.useMemo(() => {
        return Array(skeletonCount)
            .fill(null)
            .map((_, index) => ({
                [keyList]: `skeleton-${index}-${Math.random().toString(36).substring(2, 9)}`
            })) as T[];
    }, [skeletonCount, keyList]);

    const skeletonRenderItem: ListRenderItem<T> = React.useCallback(() => {
        const SkeletonComponent = skeletonComponent;
        return SkeletonComponent ? <SkeletonComponent /> : null;
    }, [skeletonComponent]);

    const _renderEmpty = React.useCallback(() => {
        if (React.isValidElement(emptyComponent)) {
            return emptyComponent;
        }
        const EmptyComponent = emptyComponent as React.ComponentType;
        return EmptyComponent ? <EmptyComponent /> : null;
    }, [emptyComponent]);

    const _renderList = React.useMemo(
        () => (
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
                keyExtractor={(item) =>
                    isLoading
                        ? item[keyList]
                        : item[keyList]?.toString() || `item-${Math.random().toString(36).substring(2, 9)}`
                }
                data={isLoading ? dummyArray : data}
                renderItem={isLoading ? skeletonRenderItem : renderItem}
                numColumns={numColumns}
                contentContainerStyle={{
                    paddingTop: pt,
                    paddingBottom: pb
                }}
                estimatedItemSize={200}
                onEndReachedThreshold={0.1}
                scrollEnabled={!isLoading}
            />
        ),
        [
            data,
            dummyArray,
            isLoading,
            skeletonRenderItem,
            ref,
            rest,
            horizontal,
            showsVerticalScrollIndicator,
            showsHorizontalScrollIndicator,
            listHeaderComponent,
            _renderLoadingLoadMore,
            _refreshControl,
            onPressLoadMore,
            renderItem,
            numColumns,
            pt,
            pb,
            keyList,
            _renderEmpty
        ]
    );

    return <>{_renderList}</>;
}

const ForwardedListView = React.memo(React.forwardRef(ListView)) as unknown as <T extends Data>(
    props: ListViewProps<T> & { ref?: React.ForwardedRef<ListViewRef<T>> }
) => React.ReactElement;

export default ForwardedListView;
