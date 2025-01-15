import React from "react";
import { View, ViewStyle } from "react-native";

import { vstackStyle } from "./styles";

import type { VariantProps } from "@gluestack-ui/nativewind-utils";

type StyleProps = Omit<ViewStyle, "transform">;

type IVStackProps = Omit<React.ComponentProps<typeof View>, keyof StyleProps> &
    StyleProps &
    VariantProps<typeof vstackStyle> & {
        className?: string;
    };

const createStyleFromProps = (props: StyleProps): ViewStyle => {
    const styleKeys = Object.keys(props).filter((key) => props[key as keyof StyleProps] !== undefined);
    return Object.fromEntries(styleKeys.map((key) => [key, props[key as keyof StyleProps]])) as ViewStyle;
};

const VStack = React.forwardRef<React.ElementRef<typeof View>, IVStackProps>(
    ({ className, space, reversed, style, ...props }, ref) => {
        const styleProps = createStyleFromProps(props as StyleProps);

        return (
            <View
                className={vstackStyle({ space, reversed, class: className })}
                style={[styleProps, style]}
                {...props}
                ref={ref}
            />
        );
    }
);

VStack.displayName = "VStack";

export default VStack;
