import React from 'react';
import { ActivityIndicator } from 'react-native';

import { Box } from '../ui';

import type { LoadingBoxProps } from '../ui/box/LoadingBox';

const LoadingFooter: React.FC<LoadingBoxProps> = (props) => {
    const { isLoading } = props;
    if (!isLoading) return null;
    return (
        <Box className="py-2">
            <ActivityIndicator size="small" color="black" />
        </Box>
    );
};

export default LoadingFooter;
