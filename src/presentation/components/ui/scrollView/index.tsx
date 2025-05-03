import { cssInterop } from "nativewind";
import React from "react";
import { ScrollView as RNScrollView, ViewStyle } from "react-native";

import { scrollViewStyle } from "./styles";

import type { VariantProps } from "@gluestack-ui/nativewind-utils";

const UIScrollView = RNScrollView;
cssInterop(UIScrollView, {
    className: "style",
    contentContainerClassName: "contentContainerStyle"
});

type StyleProps = Omit<ViewStyle, "transform">;
type ContentContainerStyleProps = Omit<ViewStyle, "transform">;

export type IScrollViewProps = Omit<React.ComponentProps<typeof UIScrollView>, keyof StyleProps> &
    StyleProps & {
        contentContainerStyle?: ContentContainerStyleProps;
        className?: string;
        contentClassName?: string;
        space?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl";
    } & VariantProps<typeof scrollViewStyle>;

const createStyleFromProps = (props: StyleProps): ViewStyle => {
    const styleKeys = Object.keys(props).filter((key) => props[key as keyof StyleProps] !== undefined);
    return Object.fromEntries(styleKeys.map((key) => [key, props[key as keyof StyleProps]])) as ViewStyle;
};

const ScrollView = React.forwardRef<React.ComponentRef<typeof UIScrollView>, IScrollViewProps>(
    (
        {
            className,
            contentClassName,
            space,
            style,
            contentContainerStyle,
            showsVerticalScrollIndicator = false,
            ...props
        },
        ref
    ) => {
        const styleProps = createStyleFromProps(props as StyleProps);

        const contentClassNames = [
            contentClassName,
            space &&
                scrollViewStyle({ space })
                    .split(" ")
                    .find((cls: string) => cls.startsWith("gap-"))
        ]
            .filter(Boolean)
            .join(" ");

        return (
            <UIScrollView
                ref={ref}
                {...props}
                className={scrollViewStyle({ class: className })}
                contentContainerClassName={contentClassNames}
                showsVerticalScrollIndicator={showsVerticalScrollIndicator}
                style={[styleProps, style]}
                contentContainerStyle={contentContainerStyle}
            />
        );
    }
);

ScrollView.displayName = "ScrollView";

export default ScrollView;
