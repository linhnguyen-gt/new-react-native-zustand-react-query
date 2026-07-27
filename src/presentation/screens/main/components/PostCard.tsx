import React from 'react';

import { Box, Text } from '@/presentation/components/ui';

/**
 * A single post row.
 *
 * Extracted from `main` and memoised deliberately. It previously lived as a plain
 * `renderItem` function that the screen *invoked* rather than rendered, so it could
 * not be memoised at all and every re-render of the screen rebuilt all N card trees.
 */
const PostCard = React.memo<{ item: ResponseData }>(({ item }) => (
    <Box className="mb-4 rounded-3xl bg-white p-5 shadow-lg">
        <Box className="mb-4 flex-row items-center">
            <Box className="h-14 w-14 items-center justify-center rounded-full bg-indigo-500 shadow-md">
                <Text size="xl" fontWeight="bold" className="text-white">
                    #{item.id}
                </Text>
            </Box>
            <Box className="ml-4 flex-1">
                <Text size="lg" fontWeight="bold" className="text-slate-800" numberOfLines={2}>
                    {item.title}
                </Text>
                <Box className="mt-2 flex-row items-center">
                    <Box className="mr-2 rounded-xl bg-slate-100 px-3 py-1">
                        <Text size="sm" className="text-slate-500">
                            User: {item.userId}
                        </Text>
                    </Box>
                    <Text size="sm" className="text-slate-400">
                        Post ID: {item.id}
                    </Text>
                </Box>
            </Box>
        </Box>

        <Box className="rounded-2xl bg-slate-50 p-4">
            <Box className="mb-2 flex-row items-start">
                <Box className="rounded-2xl bg-indigo-400 p-3 shadow-sm">
                    <Text size="lg" className="text-white">
                        📝
                    </Text>
                </Box>
                <Box className="ml-4 flex-1">
                    <Text size="sm" className="mb-1 text-slate-500">
                        Content
                    </Text>
                    <Text size="md" className="text-slate-800" numberOfLines={3}>
                        {item.body}
                    </Text>
                </Box>
            </Box>
        </Box>
    </Box>
));

PostCard.displayName = 'PostCard';

export default PostCard;
