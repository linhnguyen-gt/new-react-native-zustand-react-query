import React from "react";
import { View, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { boxStyle } from "./styles";

import type { VariantProps } from "@gluestack-ui/nativewind-utils";

type StyleProps = Omit<ViewStyle, "transform">;

export type BaseBoxProps = Omit<React.ComponentProps<typeof View>, keyof StyleProps> &
    StyleProps &
    VariantProps<typeof boxStyle> & {
        className?: string;
        safeArea?: boolean;
    };

const createStyleFromProps = (props: StyleProps): ViewStyle => {
    const styleKeys = Object.keys(props).filter((key) => props[key as keyof StyleProps] !== undefined);
    return Object.fromEntries(styleKeys.map((key) => [key, props[key as keyof StyleProps]])) as ViewStyle;
};

const BaseBox = React.forwardRef<React.ComponentRef<typeof View>, BaseBoxProps>(
    ({ className, style, safeArea, ...props }, ref) => {
        const styleProps = createStyleFromProps(props as StyleProps);
        const Component = safeArea ? SafeAreaView : View;

        return (
            <Component className={boxStyle({ class: className })} style={[styleProps, style]} {...props} ref={ref} />
        );
    }
);

BaseBox.displayName = "BaseBox";
export default BaseBox;
