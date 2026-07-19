import React from 'react';

import { Box, Text } from '@/presentation/components/ui';

const EmptyPosts = React.memo(() => (
    <Box className="items-center bg-slate-50 px-6 py-12">
        <Box className="mb-4 rounded-2xl bg-slate-100 p-6">
            <Text size="2xl">📭</Text>
        </Box>
        <Text size="lg" className="font-medium text-slate-500">
            No posts available
        </Text>
        <Text size="sm" className="mt-1 text-slate-400">
            Pull to refresh or check your connection
        </Text>
    </Box>
));

EmptyPosts.displayName = 'EmptyPosts';

export default EmptyPosts;
