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
    throttleTime?: number;
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
    throttleTime = 500,
    ...rest
}) => {
    const isButtonDisabledRef = React.useRef(false);

    const handleOnPress = React.useCallback(
        (event: GestureResponderEvent) => {
            if (isButtonDisabledRef.current) return;

            isButtonDisabledRef.current = true;
            rest.onPress?.(event);

            setTimeout(() => {
                isButtonDisabledRef.current = false;
            }, throttleTime);
        },
        [rest, throttleTime]
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
