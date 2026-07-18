import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';

import MyTouchable from '../MyTouchable';

/**
 * Every interactive element in the app goes through MyTouchable. Without a default
 * accessibilityRole, TalkBack and VoiceOver announce these as plain text and give
 * no indication they can be pressed.
 */
describe('MyTouchable accessibility', () => {
    it('announces as a button by default', () => {
        render(
            <MyTouchable onPress={() => {}} testID="target">
                <Text>Press me</Text>
            </MyTouchable>
        );

        expect(screen.getByTestId('target')).toHaveProp('accessibilityRole', 'button');
    });

    it('lets a call site override the role', () => {
        render(
            <MyTouchable onPress={() => {}} testID="target" accessibilityRole="link">
                <Text>Go somewhere</Text>
            </MyTouchable>
        );

        expect(screen.getByTestId('target')).toHaveProp('accessibilityRole', 'link');
    });

    it('carries an explicit accessibilityLabel through', () => {
        render(
            <MyTouchable onPress={() => {}} testID="target" accessibilityLabel="Increase count">
                <Text>+</Text>
            </MyTouchable>
        );

        expect(screen.getByTestId('target')).toHaveProp('accessibilityLabel', 'Increase count');
    });
});
