import React from "react";
import { ActivityIndicator, View } from "react-native";

import BaseBox, { type BaseBoxProps } from "./BaseBox";

export type LoadingBoxProps = BaseBoxProps & {
    isLoading?: boolean;
};

const LoadingBox = React.forwardRef<React.ComponentRef<typeof View>, LoadingBoxProps>(
    ({ isLoading, ...props }, ref) => {
        if (!isLoading) return <BaseBox {...props} ref={ref} />;

        return (
            <>
                <BaseBox {...props} ref={ref} />
                <BaseBox className="bg-[rgb(44,51,51)] opacity-70 absolute z-10 top-0 left-0 right-0 bottom-0 flex justify-center items-center">
                    <BaseBox className="w-[100px] h-[100px] rounded-2xl bg-black items-center justify-center">
                        <ActivityIndicator size="small" color="white" />
                    </BaseBox>
                </BaseBox>
            </>
        );
    }
);

LoadingBox.displayName = "LoadingBox";
export default LoadingBox;
