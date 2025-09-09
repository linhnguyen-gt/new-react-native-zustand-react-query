import React from 'react';
import { Animated } from 'react-native';

function useShakeView(error?: string | boolean | undefined) {
    const anim = React.useRef(new Animated.Value(0));

    const shake = React.useCallback(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(anim.current, {
                    toValue: -2,
                    duration: 10,
                    useNativeDriver: true,
                }),
                Animated.timing(anim.current, {
                    toValue: 2,
                    duration: 10,
                    useNativeDriver: true,
                }),
                Animated.timing(anim.current, {
                    toValue: 0,
                    duration: 10,
                    useNativeDriver: true,
                }),
            ]),
            { iterations: 2 }
        ).start();
    }, []);

    React.useEffect(() => {
        if (error) {
            shake();
        }
    }, [error, shake]);

    return { transform: [{ translateX: anim.current }] };
}

export default useShakeView;
