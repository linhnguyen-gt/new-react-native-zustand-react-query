import { render } from '@testing-library/react-native';
import React from 'react';
import { Keyboard, Platform, Text } from 'react-native';

import KeyboardViewSpacer from '../KeyboardViewSpacer';

/**
 * Guards a deliberate platform asymmetry.
 *
 * Android sets windowSoftInputMode="adjustResize", so the window already shrinks for
 * the keyboard. Adding paddingBottom there too would push content up by roughly twice
 * the keyboard height, so this component must stay inert on Android — and must NOT be
 * "fixed" by subscribing to the keyboardDid* events.
 */
describe('KeyboardViewSpacer', () => {
    const addListener = jest.spyOn(Keyboard, 'addListener');

    const asPlatform = (os: 'ios' | 'android') => {
        jest.replaceProperty(Platform, 'OS', os);
    };

    beforeEach(() => {
        addListener.mockClear();
        addListener.mockReturnValue({ remove: jest.fn() } as never);
    });

    afterAll(() => {
        addListener.mockRestore();
    });

    const subscribedEvents = () => addListener.mock.calls.map(([event]) => event);

    it('adds no keyboard listeners on Android, where adjustResize already handles it', () => {
        asPlatform('android');

        render(
            <KeyboardViewSpacer>
                <Text>content</Text>
            </KeyboardViewSpacer>
        );

        expect(subscribedEvents()).toEqual([]);
    });

    it('subscribes to the will* events on iOS', () => {
        asPlatform('ios');

        render(
            <KeyboardViewSpacer>
                <Text>content</Text>
            </KeyboardViewSpacer>
        );

        expect(subscribedEvents()).toEqual(['keyboardWillShow', 'keyboardWillHide']);
    });

    it('removes both listeners on unmount on iOS', () => {
        asPlatform('ios');
        const remove = jest.fn();
        addListener.mockReturnValue({ remove } as never);

        const { unmount } = render(
            <KeyboardViewSpacer>
                <Text>content</Text>
            </KeyboardViewSpacer>
        );
        unmount();

        expect(remove).toHaveBeenCalledTimes(2);
    });
});
