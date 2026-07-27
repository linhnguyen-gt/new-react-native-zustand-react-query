import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';

import HStack from '../hStack';
import VStack from '../vStack';

/**
 * HStack and VStack used to wrap their children in a Touchable unconditionally.
 * Touchable defaults to accessibilityRole="button" (deliberately — so real touchables
 * announce correctly), which meant every layout container in the app was announced to
 * screen readers as a button. None of the 14 call sites passes onPress.
 */

const describeStack = (name: string, stack: typeof VStack) => {
    // Aliased to satisfy JSX, which treats a lowercase tag as a host component.
    const Stack = stack;

    describe(`${name} touchable wrapping`, () => {
        it('renders a plain view with no button role when no onPress is given', () => {
            render(
                <Stack testID="stack">
                    <Text>content</Text>
                </Stack>
            );

            // The container itself must not claim to be a button.
            expect(screen.queryByRole('button')).toBeNull();
            expect(screen.getByText('content')).toBeTruthy();
        });

        it('still wraps in a touchable when onPress is given', () => {
            const onPress = jest.fn();
            render(
                <Stack onPress={onPress}>
                    <Text>pressable</Text>
                </Stack>
            );

            const button = screen.getByRole('button');
            expect(button).toBeTruthy();

            fireEvent.press(button);
            expect(onPress).toHaveBeenCalledTimes(1);
        });
    });
};

describeStack('VStack', VStack);
describeStack('HStack', HStack);
