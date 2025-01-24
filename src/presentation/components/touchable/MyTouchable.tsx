import React from "react";
import { ColorValue, DimensionValue, FlexAlignType, GestureResponderEvent } from "react-native";
import { TouchableWithoutFeedbackProps } from "react-native/Libraries/Components/Touchable/TouchableWithoutFeedback";

import { Touchable } from "../ui";

type MyTouchableProps = TouchableWithoutFeedbackProps & {
    children: React.ReactNode;
    width?: DimensionValue;
    borderRadius?: number;
    bg?: ColorValue;
    py?: DimensionValue;
    zIndex?: number;
    flex?: number;
    alignItems?: FlexAlignType;
    activeOpacity?: number;
    borderWidth?: number;
    height?: number;
};

const MyTouchable: React.FC<MyTouchableProps> = ({
    zIndex,
    children,
    borderRadius,
    width,
    bg,
    py,
    alignItems,
    activeOpacity = 0.7,
    borderWidth,
    flex,
    height,
    ...rest
}) => {
    const [isButtonDisabled, setButtonDisabled] = React.useState(false);
    const handleOnPress = React.useCallback(
        (event: GestureResponderEvent) => {
            if (isButtonDisabled) return;
            setButtonDisabled(true);
            rest.onPress?.(event);
            setTimeout(() => {
                setButtonDisabled(false);
            }, 100);
        },
        [isButtonDisabled, rest]
    );
    return (
        <Touchable
            {...rest}
            onPress={handleOnPress}
            activeOpacity={activeOpacity}
            width={width}
            borderRadius={borderRadius}
            backgroundColor={bg}
            paddingVertical={py}
            zIndex={zIndex}
            alignItems={alignItems}
            borderWidth={borderWidth}
            flex={flex}
            height={height}>
            {children}
        </Touchable>
    );
};

export default React.memo(MyTouchable);
