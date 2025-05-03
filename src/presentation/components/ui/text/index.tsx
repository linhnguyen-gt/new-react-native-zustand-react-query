import React from "react";
import { Text as RNText, TextStyle } from "react-native";

import { textStyle } from "./styles";

import type { VariantProps } from "@gluestack-ui/nativewind-utils";

type StyleProps = Omit<TextStyle, "transform">;

export type ITextProps = Omit<React.ComponentProps<typeof RNText>, keyof StyleProps> &
    StyleProps &
    VariantProps<typeof textStyle> & {
        className?: string;
    };

const createStyleFromProps = (props: StyleProps): TextStyle => {
    const styleKeys = Object.keys(props).filter((key) => props[key as keyof StyleProps] !== undefined);
    return Object.fromEntries(styleKeys.map((key) => [key, props[key as keyof StyleProps]])) as TextStyle;
};

const Text = React.forwardRef<React.ComponentRef<typeof RNText>, ITextProps>(
    (
        {
            className,
            isTruncated,
            bold,
            underline,
            strikeThrough,
            size = "md",
            sub,
            italic,
            highlight,
            style,
            ...props
        },
        ref
    ) => {
        const styleProps = createStyleFromProps(props as StyleProps);

        return (
            <RNText
                className={textStyle({
                    isTruncated,
                    bold,
                    underline,
                    strikeThrough,
                    size,
                    sub,
                    italic,
                    highlight,
                    class: className
                })}
                style={[styleProps, style]}
                {...props}
                ref={ref}
            />
        );
    }
);

Text.displayName = "Text";
export default Text;
