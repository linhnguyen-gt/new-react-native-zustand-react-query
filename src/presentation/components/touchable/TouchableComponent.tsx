import { tva } from '@gluestack-ui/nativewind-utils/tva';
import React from 'react';
import { TouchableOpacity, TouchableOpacityProps, ViewStyle } from 'react-native';

import type { VariantProps } from '@gluestack-ui/nativewind-utils';

// Not exported: consumed only by TouchableComponentProps and the render below.
const touchableStyle = tva({});

type StyleProps = Omit<ViewStyle, 'transform'>;

export type TouchableComponentProps = Omit<TouchableOpacityProps, keyof StyleProps> &
    StyleProps &
    VariantProps<typeof touchableStyle> & {
        className?: string;
    };

const createStyleFromProps = (props: StyleProps): ViewStyle => {
    const styleKeys = Object.keys(props).filter((key) => props[key as keyof StyleProps] !== undefined);
    return Object.fromEntries(styleKeys.map((key) => [key, props[key as keyof StyleProps]])) as ViewStyle;
};

const TouchableComponent = React.forwardRef<React.ComponentRef<typeof TouchableOpacity>, TouchableComponentProps>(
    ({ className, style, ...props }, ref) => {
        const styleProps = createStyleFromProps(props as StyleProps);

        return (
            <TouchableOpacity
                activeOpacity={0.5}
                disabled={props.disabled || !props.onPress}
                // Default to the button role so screen readers announce these as
                // actionable. Without it TalkBack and VoiceOver read them as plain
                // text and give no affordance that they can be pressed. Spread after
                // this so a call site can override with link/tab/etc.
                accessibilityRole="button"
                className={touchableStyle({ class: className })}
                style={[styleProps, style]}
                {...props}
                ref={ref}
            />
        );
    }
);

TouchableComponent.displayName = 'TouchableComponent';
export default TouchableComponent;
