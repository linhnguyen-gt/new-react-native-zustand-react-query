import React from "react";
import { View } from "react-native";

import BaseBox, { type BaseBoxProps } from "../box/BaseBox";
import LoadingBox from "../box/LoadingBox";

type ContainerBoxProps = BaseBoxProps & {
    isLoading?: boolean;
    safeAreaTop?: boolean;
    safeAreaBottom?: boolean;
    safeArea?: boolean;
};

const ContainerBox = React.forwardRef<React.ComponentRef<typeof View>, ContainerBoxProps>(
    ({ backgroundColor = "white", isLoading = false, safeAreaTop, safeAreaBottom, safeArea, ...props }, ref) => {
        return (
            <BaseBox
                className={`${safeAreaTop ? "mt-safe" : ""} ${safeAreaBottom ? "mb-safe" : ""} ${safeArea ? "mt-safe mb-safe" : ""}`}
                flex={1}>
                <BaseBox flex={1} backgroundColor={backgroundColor} {...props} ref={ref}>
                    {props.children}
                </BaseBox>
                {isLoading && <LoadingBox />}
            </BaseBox>
        );
    }
);

ContainerBox.displayName = "ContainerBox";
export default ContainerBox;
