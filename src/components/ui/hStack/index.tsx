import React from "react";
import { View, ViewStyle } from "react-native";

import { hstackStyle } from "./styles";

import type { VariantProps } from "@gluestack-ui/nativewind-utils";

type StyleProps = Omit<ViewStyle, "transform">;

type IHStackProps = Omit<React.ComponentProps<typeof View>, keyof StyleProps> &
    StyleProps &
    VariantProps<typeof hstackStyle> & {
        className?: string;
    };

const createStyleFromProps = (props: StyleProps): ViewStyle => {
    const styleKeys = Object.keys(props).filter((key) => props[key as keyof StyleProps] !== undefined);
    return Object.fromEntries(styleKeys.map((key) => [key, props[key as keyof StyleProps]])) as ViewStyle;
};

const HStack = React.forwardRef<React.ElementRef<typeof View>, IHStackProps>(
    ({ className, space, reversed, style, ...props }, ref) => {
        const styleProps = createStyleFromProps(props as StyleProps);

        return (
            <View
                className={hstackStyle({ space, reversed, class: className })}
                style={[styleProps, style]}
                {...props}
                ref={ref}
            />
        );
    }
);

HStack.displayName = "HStack";

export default HStack;
