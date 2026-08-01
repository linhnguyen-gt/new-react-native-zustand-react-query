import React from 'react';
import { View, type ViewStyle } from 'react-native';

import Touchable from '../touch';

import { hstackStyle } from './styles';

import type { VariantProps } from '@/shared/style';

type StyleProps = Omit<ViewStyle, 'transform'>;

type IHStackProps = Omit<React.ComponentProps<typeof View>, keyof StyleProps> &
    StyleProps &
    VariantProps<typeof hstackStyle> & {
        className?: string;
        onPress?: () => void;
    };

const createStyleFromProps = (props: StyleProps): ViewStyle => {
    const styleKeys = Object.keys(props).filter((key) => props[key as keyof StyleProps] !== undefined);
    return Object.fromEntries(styleKeys.map((key) => [key, props[key as keyof StyleProps]])) as ViewStyle;
};

const HStack = React.forwardRef<React.ComponentRef<typeof View>, IHStackProps>(
    ({ className, space, reversed, style, onPress, children, ...props }, ref) => {
        const styleProps = createStyleFromProps(props as StyleProps);
        const resolvedClassName = hstackStyle({ space, reversed, class: className });

        // Only wrap in a Touchable when there is something to press. Touchable defaults
        // to accessibilityRole="button", so wrapping unconditionally announced every
        // layout container to screen readers as a button.
        // `props` is deliberately not spread onto either branch: the layout values it
        // carries (flex, marginBottom, …) are style props, already folded into
        // styleProps above, and spreading them would pass them to the element as
        // invalid props. This matches what the Touchable-only version did.
        if (!onPress) {
            return (
                <View className={resolvedClassName} style={[styleProps, style]} ref={ref}>
                    {children}
                </View>
            );
        }

        return (
            <Touchable onPress={onPress} className={resolvedClassName} style={[styleProps, style]} ref={ref}>
                {children}
            </Touchable>
        );
    }
);

HStack.displayName = 'HStack';

export default HStack;
