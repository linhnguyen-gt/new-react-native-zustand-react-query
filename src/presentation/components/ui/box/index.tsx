import React from "react";
import { View, ViewStyle, SafeAreaView } from "react-native";

import { boxStyle } from "./styles";

import type { VariantProps } from "@gluestack-ui/nativewind-utils";

type StyleProps = Omit<ViewStyle, "transform">;

export type IBoxProps = Omit<React.ComponentProps<typeof View>, keyof StyleProps> &
    StyleProps &
    VariantProps<typeof boxStyle> & {
        className?: string;
        safeArea?: boolean;
    };

const createStyleFromProps = (props: StyleProps): ViewStyle => {
    const styleKeys = Object.keys(props).filter((key) => props[key as keyof StyleProps] !== undefined);
    return Object.fromEntries(styleKeys.map((key) => [key, props[key as keyof StyleProps]])) as ViewStyle;
};

const Box = React.forwardRef<React.ElementRef<typeof View>, IBoxProps>(
    ({ className, style, safeArea, ...props }, ref) => {
        const styleProps = createStyleFromProps(props as StyleProps);
        const Component = safeArea ? SafeAreaView : View;

        return (
            <Component className={boxStyle({ class: className })} style={[styleProps, style]} {...props} ref={ref} />
        );
    }
);

Box.displayName = "Box";
export default Box;
