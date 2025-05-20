import * as React from "react";
import { Animated, Keyboard, KeyboardEvent } from "react-native";

type KeyboardViewSpacerProps = {
    children: Array<React.ReactNode> | React.ReactNode;
    useNativeDriver?: boolean;
};

const KeyboardViewSpacer: React.FC<KeyboardViewSpacerProps> = ({ children, useNativeDriver = false }) => {
    const keyboardHeight = React.useRef(new Animated.Value(0)).current;

    const keyboardWillShow = React.useCallback(
        (event: KeyboardEvent) => {
            Animated.parallel([
                Animated.timing(keyboardHeight, {
                    duration: event.duration,
                    toValue: event.endCoordinates.height - 25,
                    useNativeDriver
                })
            ]).start();
        },
        [keyboardHeight, useNativeDriver]
    );

    const keyboardWillHide = React.useCallback(
        (event: KeyboardEvent) => {
            Animated.parallel([
                Animated.timing(keyboardHeight, {
                    duration: event.duration,
                    toValue: 0,
                    useNativeDriver
                })
            ]).start();
        },
        [keyboardHeight, useNativeDriver]
    );
    React.useEffect(() => {
        const showListener = Keyboard.addListener("keyboardWillShow", keyboardWillShow);
        const hideListener = Keyboard.addListener("keyboardWillHide", keyboardWillHide);

        return () => {
            showListener.remove();
            hideListener.remove();
        };
    }, [keyboardHeight, keyboardWillHide, keyboardWillShow]);

    return <Animated.View style={{ paddingBottom: keyboardHeight, flex: 1 }}>{children}</Animated.View>;
};

export default React.memo(KeyboardViewSpacer);
