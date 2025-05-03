import React from "react";
import { View } from "react-native";

import ContainerBox from "./ContainerBox";

import type { BaseBoxProps } from "../box/BaseBox";

type ContainerProps = BaseBoxProps & {
    isLoading?: boolean;
    safeAreaTop?: boolean;
    safeAreaBottom?: boolean;
    safeArea?: boolean;
};

const Container = React.forwardRef<React.ComponentRef<typeof View>, ContainerProps>((props, ref) => {
    return <ContainerBox {...props} ref={ref} />;
});

Container.displayName = "Container";
export default Container;
