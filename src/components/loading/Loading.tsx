import { StyledComponentProps } from "@gluestack-style/react/lib/typescript/types";
import React from "react";
import { ActivityIndicator, StyleProp, View, ViewProps, ViewStyle } from "react-native";

import { Box } from "@/components";

type LoadingProps = StyledComponentProps<StyleProp<ViewStyle>, unknown, ViewProps, "Box", typeof View> & {
    isLoading?: boolean;
};

const Loading: React.FC<LoadingProps> = ({ isLoading }) => {
    if (!isLoading) return null;

    return (
        <Box className="bg-[rgb(44,51,51)] opacity-70 absolute z-10 top-0 left-0 right-0 bottom-0 flex justify-center items-center">
            <Box className="w-[100px] h-[100px] rounded-2xl bg-black items-center justify-center">
                <ActivityIndicator size="small" color="white" />
            </Box>
        </Box>
    );
};

export default Loading;
