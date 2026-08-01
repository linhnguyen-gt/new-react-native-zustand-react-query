import React from 'react';
import { View, type ViewStyle } from 'react-native';

import Touchable from '../touch';

import { vstackStyle } from './styles';

import type { VariantProps } from '@/shared/style';

type StyleProps = Omit<ViewStyle, 'transform'>;

export type IVStackProps = Omit<React.ComponentProps<typeof View>, keyof StyleProps> &
    StyleProps &
    VariantProps<typeof vstackStyle> & {
        className?: string;
        onPress?: () => void;
    };

const createStyleFromProps = (props: StyleProps): ViewStyle => {
    const styleKeys = Object.keys(props).filter((key) => props[key as keyof StyleProps] !== undefined);
    return Object.fromEntries(styleKeys.map((key) => [key, props[key as keyof StyleProps]])) as ViewStyle;
};

const VStack = React.forwardRef<React.ComponentRef<typeof View>, IVStackProps>(
    ({ className, space, reversed, style, onPress, children, ...props }, ref) => {
        const styleProps = createStyleFromProps(props as StyleProps);
        const resolvedClassName = vstackStyle({ space, reversed, class: className });

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
            <Touchable className={resolvedClassName} style={[styleProps, style]} ref={ref} onPress={onPress}>
                {children}
            </Touchable>
        );
    }
);

VStack.displayName = 'VStack';

export default VStack;
