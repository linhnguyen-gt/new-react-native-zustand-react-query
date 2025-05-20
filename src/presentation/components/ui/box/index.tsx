import React from "react";
import { View } from "react-native";

import BaseBox, { type BaseBoxProps } from "./BaseBox";

export type IBoxProps = BaseBoxProps;

const Box = React.forwardRef<React.ComponentRef<typeof View>, IBoxProps>(({ ...props }, ref) => {
    return <BaseBox {...props} ref={ref} />;
});

Box.displayName = "Box";
export default Box;
