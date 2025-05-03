import React from "react";
import { ActivityIndicator } from "react-native";

import { LoadingBox } from "../ui";

import type { LoadingBoxProps } from "../ui/box/LoadingBox";

const LoadingFooter: React.FC<LoadingBoxProps> = (props) => {
    return (
        <LoadingBox {...props}>
            <ActivityIndicator size="small" color="black" />
        </LoadingBox>
    );
};

export default LoadingFooter;
