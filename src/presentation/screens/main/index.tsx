import React from 'react';
import { StatusBar, useColorScheme } from 'react-native';

import { useResponse } from '@/presentation/hooks';

import { ListView } from '@/presentation/components/listView';
import { Loading } from '@/presentation/components/loading';
import { Box, Text } from '@/presentation/components/ui';

import EmptyPosts from './components/EmptyPosts';
import PostCard from './components/PostCard';
import PostsHeader from './components/PostsHeader';

/**
 * Rows carry the slate-50 background and their own trailing gap.
 *
 * The old layout nested every post inside one `bg-slate-50` container. With a
 * virtualised list the rows are recycled independently, so the background travels
 * with the row instead of coming from a shared parent.
 *
 * The gap lives inside the row rather than in `ItemSeparatorComponent`, which renders
 * only *between* items. The old screen emitted a spacer after every post including the
 * last, and that trailing spacer is what carried the slate sheet to the end of the
 * content — a separator would have left the final row flush against the list edge.
 */
const renderPost = ({ item }: { item: ResponseData }) => (
    <Box className="bg-slate-50 px-6">
        <PostCard item={item} />
        <Box className="h-4" />
    </Box>
);

const MainPage = () => {
    const { response, isLoading, error } = useResponse();
    const isDarkMode = useColorScheme() === 'dark';

    const listHeader = React.useMemo(() => <PostsHeader postCount={response.length} />, [response.length]);

    if (error) {
        return (
            <Box className="flex-1 items-center justify-center p-6">
                <Box className="bg-red-50 w-full items-center rounded-3xl p-6 shadow-md">
                    <Box className="bg-red-100 mb-4 rounded-2xl p-4">
                        <Text size="2xl" className="text-red-600">
                            ⚠️
                        </Text>
                    </Box>
                    <Text size="xl" className="text-red-600 font-bold">
                        Error Occurred
                    </Text>
                    <Text size="md" className="text-red-500 mt-2 text-center">
                        {error.message}
                    </Text>
                </Box>
            </Box>
        );
    }

    return (
        <Box className="flex-1">
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

            {/*
                No enclosing ScrollView. The posts previously rendered via `.map()`
                inside one, mounting every card at once — roughly 1500 native views for
                the 100 posts the API returns, with no recycling. Dropping a FlashList
                into that ScrollView would not have helped: nesting a virtualised list
                in a same-axis scroll container defeats virtualisation and warns.
            */}
            <ListView<ResponseData>
                data={response}
                keyList="id"
                renderItem={renderPost}
                listHeaderComponent={listHeader}
                emptyComponent={EmptyPosts}
                isLoading={isLoading}
                /*
                    ListView defaults to 100px of bottom padding, which sits outside the
                    slate-backed rows and would end the sheet in a white band above the
                    screen edge. The old screen had no such padding.
                */
                pb={0}
            />

            <Loading isLoading={isLoading} />
        </Box>
    );
};

export default MainPage;
