import React from "react";
import { GestureResponderEvent } from "react-native";

import TouchableComponent, { TouchableComponentProps } from "./TouchableComponent";

type MyTouchableProps = TouchableComponentProps & {
    throttleTime?: number;
};

const MyTouchable: React.FC<MyTouchableProps> = ({ throttleTime = 500, ...props }) => {
    const isButtonDisabledRef = React.useRef(false);

    const handleOnPress = React.useCallback(
        (event: GestureResponderEvent) => {
            if (isButtonDisabledRef.current) return;

            isButtonDisabledRef.current = true;
            props.onPress?.(event);

            setTimeout(() => {
                isButtonDisabledRef.current = false;
            }, throttleTime);
        },
        [props, throttleTime]
    );

    return <TouchableComponent {...props} onPress={handleOnPress} />;
};

export default React.memo(MyTouchable);
