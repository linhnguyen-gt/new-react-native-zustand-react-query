import { CardStyleInterpolators, StackNavigationOptions } from '@react-navigation/stack';
import { Easing, Platform } from 'react-native';

export const defaultOptions: StackNavigationOptions = {
    headerShown: false,
    cardStyle: {
        backgroundColor: 'white',
    },
};

export const screenOptions = (): StackNavigationOptions => {
    return {
        ...defaultOptions,
        transitionSpec: {
            open: {
                animation: 'timing',
                config: { duration: 200, easing: Easing.linear },
            },
            close: {
                animation: 'timing',
                config: { duration: 200, easing: Easing.linear },
            },
        },
        cardStyleInterpolator:
            Platform.OS === 'ios' ? CardStyleInterpolators.forHorizontalIOS : CardStyleInterpolators.forFadeFromCenter,
    };
};
