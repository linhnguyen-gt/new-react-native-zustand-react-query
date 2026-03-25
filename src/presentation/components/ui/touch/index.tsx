import React from 'react';
import { TouchableOpacity, ViewStyle } from 'react-native';

import TouchableComponent, { TouchableComponentProps } from '../../touchable/TouchableComponent';
import { StyleProps } from 'react-native-reanimated';

const createStyleFromProps = (props: StyleProps): ViewStyle => {
    const styleKeys = Object.keys(props).filter((key) => props[key as keyof StyleProps] !== undefined);
    return Object.fromEntries(styleKeys.map((key) => [key, props[key as keyof StyleProps]])) as ViewStyle;
};

const Touchable = React.forwardRef<React.ComponentRef<typeof TouchableOpacity>, TouchableComponentProps>(
    ({ className, style, ...props }, ref) => {
        const styleProps = createStyleFromProps(props as StyleProps);

        return <TouchableComponent className={className} style={[styleProps, style]} {...props} ref={ref} />;
    }
);

Touchable.displayName = 'Touchable';

export default Touchable;
