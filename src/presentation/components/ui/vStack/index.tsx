import React from 'react';
import { View, ViewStyle } from 'react-native';

import Touchable from '../touch';

import { vstackStyle } from './styles';

import type { VariantProps } from '@gluestack-ui/nativewind-utils';

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
    ({ className, space, reversed, style, onPress, ...props }, ref) => {
        const styleProps = createStyleFromProps(props as StyleProps);

        return (
            <Touchable
                className={vstackStyle({ space, reversed, class: className })}
                style={[styleProps, style]}
                {...props}
                ref={ref}
                onPress={onPress}
            />
        );
    }
);

VStack.displayName = 'VStack';

export default VStack;
