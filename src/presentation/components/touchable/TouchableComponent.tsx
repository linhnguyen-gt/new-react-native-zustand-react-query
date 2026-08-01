import React from 'react';
import { TouchableOpacity, type TouchableOpacityProps, type ViewStyle } from 'react-native';

type StyleProps = Omit<ViewStyle, 'transform'>;

export type TouchableComponentProps = Omit<TouchableOpacityProps, keyof StyleProps> &
    StyleProps & {
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
                className={className}
                style={[styleProps, style]}
                {...props}
                ref={ref}
            />
        );
    }
);

TouchableComponent.displayName = 'TouchableComponent';
export default TouchableComponent;
