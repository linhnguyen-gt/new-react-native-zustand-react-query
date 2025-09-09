import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import BaseBox, { type BaseBoxProps } from './BaseBox';

export type LoadingBoxProps = BaseBoxProps & {
    isLoading?: boolean;
};

const LoadingBox = React.forwardRef<React.ComponentRef<typeof View>, LoadingBoxProps>(
    ({ isLoading, ...props }, ref) => {
        if (!isLoading) return <BaseBox {...props} ref={ref} />;

        return (
            <>
                <BaseBox {...props} ref={ref} />
                <BaseBox className="absolute bottom-0 left-0 right-0 top-0 z-10 flex items-center justify-center bg-[rgb(44,51,51)] opacity-70">
                    <BaseBox className="h-[100px] w-[100px] items-center justify-center rounded-2xl bg-black">
                        <ActivityIndicator size="small" color="white" />
                    </BaseBox>
                </BaseBox>
            </>
        );
    }
);

LoadingBox.displayName = 'LoadingBox';
export default LoadingBox;
