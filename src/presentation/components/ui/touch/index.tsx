import { tva } from "@gluestack-ui/nativewind-utils/tva";
import React from "react";
import { TouchableOpacity, TouchableOpacityProps, ViewStyle } from "react-native";

import type { VariantProps } from "@gluestack-ui/nativewind-utils";

export const touchableStyle = tva({});

type StyleProps = Omit<ViewStyle, "transform">;

export type ITouchableProps = Omit<TouchableOpacityProps, keyof StyleProps> &
    StyleProps &
    VariantProps<typeof touchableStyle> & {
        className?: string;
    };

const createStyleFromProps = (props: StyleProps): ViewStyle => {
    const styleKeys = Object.keys(props).filter((key) => props[key as keyof StyleProps] !== undefined);
    return Object.fromEntries(styleKeys.map((key) => [key, props[key as keyof StyleProps]])) as ViewStyle;
};

const Touchable = React.forwardRef<React.ElementRef<typeof TouchableOpacity>, ITouchableProps>(
    ({ className, style, ...props }, ref) => {
        const styleProps = createStyleFromProps(props as StyleProps);

        return (
            <TouchableOpacity
                className={touchableStyle({ class: className })}
                style={[styleProps, style]}
                {...props}
                ref={ref}
            />
        );
    }
);

Touchable.displayName = "Touchable";
export default Touchable;
