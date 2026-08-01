import { colorScheme as colorSchemeNW } from 'nativewind';
import React from 'react';
import { type ColorSchemeName, useColorScheme, View, type ViewProps } from 'react-native';

import { config } from './config';

type ModeType = 'light' | 'dark' | 'system';

const getColorSchemeName = (colorScheme: ColorSchemeName, mode: ModeType): 'light' | 'dark' => {
    if (mode === 'system') {
        return colorScheme === 'dark' ? 'dark' : 'light';
    }
    return mode;
};

/**
 * Applies the NativeWind theme variables backing every `--color-*` Tailwind colour.
 *
 * Was GluestackUIProvider, which additionally mounted OverlayProvider and
 * ToastProvider. The toast module is gone, and nothing renders a gluestack overlay —
 * the update modal uses React Native's own Modal — so both wrappers went with the
 * dependency. The theme View itself is unchanged.
 */
export function ThemeProvider({
    mode = 'light',
    ...props
}: {
    mode?: ModeType;
    children?: React.ReactNode;
    style?: ViewProps['style'];
}) {
    const colorScheme = useColorScheme();

    const colorSchemeName = getColorSchemeName(colorScheme, mode);

    colorSchemeNW.set(mode);

    return (
        <View style={[config[colorSchemeName], { flex: 1, height: '100%', width: '100%' }, props.style]}>
            {props.children}
        </View>
    );
}
