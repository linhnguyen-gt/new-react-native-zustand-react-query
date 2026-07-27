import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

const mockCheckForUpdateAsync = jest.fn();
const mockFetchUpdateAsync = jest.fn();
const mockReloadAsync = jest.fn();
const mockUseUpdates = jest.fn();

jest.mock('expo-updates', () => ({
    checkForUpdateAsync: (...args: unknown[]) => mockCheckForUpdateAsync(...args),
    fetchUpdateAsync: (...args: unknown[]) => mockFetchUpdateAsync(...args),
    reloadAsync: (...args: unknown[]) => mockReloadAsync(...args),
    useUpdates: () => mockUseUpdates(),
}));

import ModalUpdate, { isOfflineError } from '../index';

const idleUpdatesState = {
    isUpdateAvailable: false,
    isUpdatePending: false,
    isDownloading: false,
    availableUpdate: undefined,
    currentlyRunning: { updateId: 'current' },
};

describe('isOfflineError', () => {
    it.each([
        'Network request failed',
        'Unable to resolve host "u.expo.dev"',
        'The request timed out',
        'connect ECONNREFUSED 127.0.0.1:443',
    ])('treats %s as a connectivity problem', (message) => {
        expect(isOfflineError(new Error(message))).toBe(true);
    });

    it.each(['Manifest signature is invalid', 'Update payload is corrupt', 'Permission denied'])(
        'does not swallow %s',
        (message) => {
            expect(isOfflineError(new Error(message))).toBe(false);
        }
    );

    it('handles non-Error throws without crashing', () => {
        expect(isOfflineError('network unreachable')).toBe(true);
        expect(isOfflineError(undefined)).toBe(false);
        expect(isOfflineError(null)).toBe(false);
    });
});

describe('<ModalUpdate />', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockUseUpdates.mockReturnValue(idleUpdatesState);
    });

    it('renders nothing when there is no update and no error', () => {
        const { toJSON } = render(<ModalUpdate />);
        expect(toJSON()).toBeNull();
    });

    describe('when the update check fails in a release build', () => {
        // The check is __DEV__-guarded, so the failure path only exists in release.
        const devFlag = globalThis as unknown as { __DEV__: boolean };
        const originalDev = devFlag.__DEV__;

        beforeEach(() => {
            devFlag.__DEV__ = false;
        });

        afterEach(() => {
            devFlag.__DEV__ = originalDev;
        });

        it('offers a way out instead of a dead end', async () => {
            mockCheckForUpdateAsync.mockRejectedValue(new Error('Manifest signature is invalid'));

            render(<ModalUpdate />);

            // Before this phase the only control was "Try Again", which re-ran the
            // same failing call behind a full-screen backdrop with no way to close.
            expect(await screen.findByText('Continue')).toBeTruthy();
            expect(screen.getByText('Try Again')).toBeTruthy();
        });

        it('actually closes when Continue is pressed', async () => {
            mockCheckForUpdateAsync.mockRejectedValue(new Error('Manifest signature is invalid'));

            const { toJSON } = render(<ModalUpdate />);

            fireEvent.press(await screen.findByText('Continue'));

            await waitFor(() => {
                expect(toJSON()).toBeNull();
            });
        });

        it('stays out of the way when the device is simply offline', async () => {
            mockCheckForUpdateAsync.mockRejectedValue(new Error('Network request failed'));

            const { toJSON } = render(<ModalUpdate />);

            await waitFor(() => {
                expect(mockCheckForUpdateAsync).toHaveBeenCalled();
            });
            await waitFor(() => {
                expect(toJSON()).toBeNull();
            });
        });
    });

    it('does not advertise a download percentage it cannot measure', () => {
        mockUseUpdates.mockReturnValue({
            ...idleUpdatesState,
            isUpdateAvailable: true,
            isUpdatePending: true,
            isDownloading: true,
            availableUpdate: { updateId: 'next' },
        });

        render(<ModalUpdate showNonCritical />);

        // Assert the positive: a bare `queryByText('50%')).toBeNull()` would also
        // pass for a regression to "0%" or "NaN%". expo-updates exposes no progress
        // through useUpdates, so an indeterminate label is the honest output.
        expect(screen.getByText('Download complete')).toBeTruthy();
        expect(screen.queryByText('50%')).toBeNull();
    });
});
