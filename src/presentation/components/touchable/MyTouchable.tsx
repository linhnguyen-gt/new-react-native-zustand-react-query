import React from 'react';
import { GestureResponderEvent } from 'react-native';

import TouchableComponent, { TouchableComponentProps } from './TouchableComponent';

type MyTouchableProps = TouchableComponentProps & {
    throttleTime?: number;
};

const MyTouchable: React.FC<MyTouchableProps> = ({ throttleTime = 500, ...props }) => {
    const isButtonDisabledRef = React.useRef(false);
    const { onPress } = props;

    const handleOnPress = React.useCallback(
        (event: GestureResponderEvent) => {
            if (isButtonDisabledRef.current) return;

            isButtonDisabledRef.current = true;
            onPress?.(event);

            setTimeout(() => {
                isButtonDisabledRef.current = false;
            }, throttleTime);
        },
        // Depends on `onPress`, not the whole `props` object. `props` is rebuilt on
        // every render, so listing it meant this callback never cached, its identity
        // changed each render, and the React.memo below was defeated — for every
        // button in the app.
        [onPress, throttleTime]
    );

    return <TouchableComponent {...props} onPress={handleOnPress} />;
};

export default React.memo(MyTouchable);
