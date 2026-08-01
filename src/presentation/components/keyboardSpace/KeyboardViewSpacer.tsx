import * as React from 'react';
import { Animated, Keyboard, type KeyboardEvent, Platform } from 'react-native';

type KeyboardViewSpacerProps = {
    children: Array<React.ReactNode> | React.ReactNode;
    useNativeDriver?: boolean;
};

/**
 * This component applies keyboard spacing on **iOS only**, deliberately.
 *
 * A code scan flagged that it listened for `keyboardWillShow`/`keyboardWillHide`,
 * which are iOS-only events, and concluded the keyboard must therefore be covering
 * inputs on Android. That conclusion was wrong: `AndroidManifest.xml` sets
 * `android:windowSoftInputMode="adjustResize"`, so Android already shrinks the window
 * when the keyboard appears and no manual padding is needed.
 *
 * Subscribing to the `keyboardDid*` events on Android — the "obvious" fix — would add
 * `paddingBottom` on top of that resize and push content up by roughly twice the
 * keyboard height. The component staying inert on Android is correct; it was just
 * correct by accident. This makes it explicit.
 *
 * If `windowSoftInputMode` ever changes to `adjustPan`, this needs to become
 * platform-agnostic again.
 */
const shouldApplySpacing = () => Platform.OS === 'ios';

const KeyboardViewSpacer: React.FC<KeyboardViewSpacerProps> = ({ children, useNativeDriver = false }) => {
    const keyboardHeight = React.useRef(new Animated.Value(0)).current;

    const handleKeyboardShow = React.useCallback(
        (event: KeyboardEvent) => {
            Animated.parallel([
                Animated.timing(keyboardHeight, {
                    duration: event.duration,
                    toValue: event.endCoordinates.height - 25,
                    useNativeDriver,
                }),
            ]).start();
        },
        [keyboardHeight, useNativeDriver]
    );

    const handleKeyboardHide = React.useCallback(
        (event: KeyboardEvent) => {
            Animated.parallel([
                Animated.timing(keyboardHeight, {
                    duration: event.duration,
                    toValue: 0,
                    useNativeDriver,
                }),
            ]).start();
        },
        [keyboardHeight, useNativeDriver]
    );

    React.useEffect(() => {
        if (!shouldApplySpacing()) return;

        const showListener = Keyboard.addListener('keyboardWillShow', handleKeyboardShow);
        const hideListener = Keyboard.addListener('keyboardWillHide', handleKeyboardHide);

        return () => {
            showListener.remove();
            hideListener.remove();
        };
    }, [handleKeyboardHide, handleKeyboardShow]);

    return <Animated.View style={{ paddingBottom: keyboardHeight, flex: 1 }}>{children}</Animated.View>;
};

export default React.memo(KeyboardViewSpacer);
