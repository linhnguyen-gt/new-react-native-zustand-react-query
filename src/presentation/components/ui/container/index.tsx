import React from "react";
import { View } from "react-native";

import ContainerBox from "./ContainerBox";

import type { BaseBoxProps } from "../box/BaseBox";

type ContainerProps = BaseBoxProps & {
    isLoading?: boolean;
    safeArea?: boolean;
};

const Container = React.forwardRef<React.ComponentRef<typeof View>, ContainerProps>(
    ({ safeArea = true, isLoading = false, ...restProps }, ref) => {
        return <ContainerBox {...restProps} safeArea={safeArea} ref={ref} isLoading={isLoading} />;
    }
);

Container.displayName = "Container";
export default Container;
