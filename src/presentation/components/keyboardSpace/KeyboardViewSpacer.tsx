import * as React from "react";
import { Animated, EmitterSubscription, Keyboard, KeyboardEvent } from "react-native";

type KeyboardViewSpacerProps = {
    children: Array<React.ReactNode> | React.ReactNode;
    useNativeDriver?: boolean;
};

const KeyboardViewSpacer: React.FC<KeyboardViewSpacerProps> = ({ children, useNativeDriver = false }) => {
    const keyboardHeight = React.useRef(new Animated.Value(0)).current;
    const keyboardWillShowSub = React.useRef<null | EmitterSubscription>(null);
    const keyboardWillHideSub = React.useRef<null | EmitterSubscription>(null);

    const keyboardWillShow = React.useCallback(
        (event: KeyboardEvent) => {
            Animated.parallel([
                Animated.timing(keyboardHeight, {
                    duration: event.duration,
                    toValue: event.endCoordinates.height - 30,
                    useNativeDriver: useNativeDriver
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
                    useNativeDriver: useNativeDriver
                })
            ]).start();
        },
        [keyboardHeight, useNativeDriver]
    );
    React.useEffect(() => {
        // trigger this after component have mounted
        keyboardWillShowSub.current = Keyboard.addListener("keyboardWillShow", keyboardWillShow);
        keyboardWillHideSub.current = Keyboard.addListener("keyboardWillHide", keyboardWillHide);
        // Clearing the events ont
        return () => {
            keyboardWillShowSub.current = null;
            keyboardWillHideSub.current = null;
        };
    }, [keyboardHeight, keyboardWillHide, keyboardWillShow]);

    return <Animated.View style={{ paddingBottom: keyboardHeight, flex: 1 }}>{children}</Animated.View>;
};

export default React.memo(KeyboardViewSpacer);
