import React from 'react';

import { RootNavigator } from '@/data/services';

import { MyTouchable } from '@/presentation/components/touchable';
import { Box, Text, VStack } from '@/presentation/components/ui';
import { appConfig } from '@/shared/config/appConfig';
import { RouteName } from '@/shared/constants';

/**
 * Everything above the posts list.
 *
 * This used to sit inside a ScrollView alongside the list. Nesting a virtualised list
 * in a same-axis ScrollView defeats virtualisation entirely, so the header moved into
 * `listHeaderComponent` and the ScrollView was removed.
 */
const PostsHeader = React.memo<{ postCount: number }>(({ postCount }) => {
    const goToCounter = React.useCallback(() => {
        RootNavigator.navigate(RouteName.Counter);
    }, []);

    return (
        <>
            <VStack space="3xl" className="p-6">
                <Box className="mb-8 mt-10 items-center">
                    <Box className="mb-5 h-20 w-20 items-center justify-center rounded-full bg-indigo-400 shadow-xl">
                        <Text size="3xl" fontWeight="bold" className="text-white">
                            RN
                        </Text>
                    </Box>
                    <Text size="3xl" fontWeight="bold" className="text-slate-800">
                        React Native
                    </Text>
                    <Text size="lg" className="mt-2 text-center text-slate-500">
                        Clean Architecture Template
                    </Text>
                </Box>

                <Box className="flex-row justify-between gap-3">
                    <Box className="flex-1 rounded-3xl bg-white p-5 shadow-lg">
                        <Box className="flex-row items-center">
                            <Box className="rounded-2xl bg-indigo-400 p-4 shadow-md">
                                <Text size="xl" className="text-white">
                                    🛠
                                </Text>
                            </Box>
                            <Box className="ml-3">
                                <Text size="md" fontWeight="bold" className="text-slate-800">
                                    Environment
                                </Text>
                                <Text size="lg" className="mt-1 font-bold text-indigo-400">
                                    {appConfig.variant}
                                </Text>
                            </Box>
                        </Box>
                    </Box>

                    <MyTouchable onPress={goToCounter}>
                        <Box className="flex-1 items-center justify-center rounded-3xl bg-indigo-400 p-5 shadow-xl">
                            <Box className="mb-3 h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
                                <Text size="2xl" fontWeight="bold" className="text-indigo-400">
                                    →
                                </Text>
                            </Box>
                            <Text size="md" fontWeight="bold" className="text-white">
                                Counter Demo
                            </Text>
                        </Box>
                    </MyTouchable>
                </Box>

                <Box className="flex-row items-center rounded-3xl bg-white p-5 shadow-lg">
                    <Box className="rounded-2xl bg-indigo-400 p-4 shadow-md">
                        <Text size="xl" className="text-white">
                            📝
                        </Text>
                    </Box>
                    <Box className="ml-4">
                        <Text size="xl" fontWeight="bold" className="text-slate-800">
                            Posts Data
                        </Text>
                        <Text size="md" className="mt-1 text-slate-500">
                            {postCount} posts available
                        </Text>
                    </Box>
                </Box>
            </VStack>

            <Box className="mt-6 rounded-t-[32px] bg-slate-50 pt-8 shadow-lg">
                <Box className="mb-6 px-6">
                    <Text size="2xl" fontWeight="bold" className="text-slate-800">
                        Posts List
                    </Text>
                    <Text size="md" className="mt-1 text-slate-500">
                        Scroll to explore all posts
                    </Text>
                </Box>
            </Box>
        </>
    );
});

PostsHeader.displayName = 'PostsHeader';

export default PostsHeader;
