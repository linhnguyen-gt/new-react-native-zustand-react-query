import { zodResolver } from '@hookform/resolvers/zod';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { z } from 'zod';

import { RootNavigator } from '@/data/services';

import { LoginPage } from '../..';

import { Errors, RouteName } from '@/shared/constants';

jest.mock('@/data/services', () => ({
    RootNavigator: {
        replaceName: jest.fn(),
    },
    environment: {
        appFlavor: 'development',
        apiBaseUrl: 'https://api.example.com',
        versionName: '1.0.0',
        versionCode: '1',
        isDevelopment: () => true,
        isStaging: () => false,
        isProduction: () => false,
    },
    reactotron: {
        zustand: {
            enhancer: jest.fn((name, creator) => creator),
        },
    },
}));

const mockLoginSchema = z.object({
    email: z
        .string()
        .min(1, Errors.REQUIRED_EMAIL_INPUT)
        .pipe(z.email(Errors.EMAIL_INVALID))
        .refine((value) => value.endsWith('.com'), {
            message: Errors.IS_NOT_EMAIL,
        }),
    password: z.string().min(1, Errors.REQUIRED_PASSWORD_INPUT),
});

describe('<LoginPage />', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders login form elements', () => {
        render(<LoginPage />);
        expect(screen.getByTestId('email-input')).toBeTruthy();
        expect(screen.getByTestId('password-input')).toBeTruthy();
        expect(screen.getByTestId('login-button')).toBeTruthy();
        expect(screen.getByText('Welcome Back')).toBeTruthy();
    });

    it('navigates to Main screen on valid form submission', async () => {
        render(<LoginPage />);

        // The form no longer ships prefilled credentials, so the test supplies them.
        // Previously this pressed submit with empty input and passed only because
        // defaultValues held a real-looking email/password pair.
        fireEvent.changeText(screen.getByTestId('email-input'), 'user@example.com');
        fireEvent.changeText(screen.getByTestId('password-input'), 'correct-horse');

        fireEvent.press(screen.getByTestId('login-button'));

        await waitFor(() => {
            expect(RootNavigator.replaceName).toHaveBeenCalledWith(RouteName.Main);
        });
    });

    it('does not navigate when the form is empty', async () => {
        render(<LoginPage />);

        fireEvent.press(screen.getByTestId('login-button'));

        await waitFor(() => {
            expect(RootNavigator.replaceName).not.toHaveBeenCalled();
        });
    });

    describe('build metadata on the pre-auth screen', () => {
        // __DEV__ is true under the jest preset, so without flipping it the release
        // branch of the gate is never exercised and deleting the gate would go
        // unnoticed. This screen is reachable without authenticating, so the
        // variant/version/build triple must not ship.
        // __DEV__ is declared as a const global by the RN types, so it is reassigned
        // through globalThis rather than directly.
        const devFlag = globalThis as unknown as { __DEV__: boolean };
        const originalDev = devFlag.__DEV__;

        afterEach(() => {
            devFlag.__DEV__ = originalDev;
        });

        it('shows build details in development', () => {
            devFlag.__DEV__ = true;
            render(<LoginPage />);

            expect(screen.queryByText('Version:')).toBeTruthy();
            expect(screen.queryByText('Build:')).toBeTruthy();
            expect(screen.queryByText('Flavor:')).toBeTruthy();
        });

        it('hides build details in release builds', () => {
            devFlag.__DEV__ = false;
            render(<LoginPage />);

            expect(screen.queryByText('Version:')).toBeNull();
            expect(screen.queryByText('Build:')).toBeNull();
            expect(screen.queryByText('Flavor:')).toBeNull();
            // The heading is not diagnostic and should survive.
            expect(screen.getByText('Welcome Back')).toBeTruthy();
        });
    });

    it('shows validation error for invalid email', async () => {
        let formState: any;

        const TestComponent = () => {
            const methods = useForm({
                defaultValues: { email: 'invalid-email', password: '123456' },
                resolver: zodResolver(mockLoginSchema),
                mode: 'onChange',
            });
            formState = methods.formState;

            React.useEffect(() => {
                methods.trigger();
            }, [methods]);

            return (
                <FormProvider {...methods}>
                    <LoginPage />
                </FormProvider>
            );
        };

        render(<TestComponent />);

        await waitFor(() => {
            expect(formState.errors).toBeDefined();
            expect(formState.errors.email).toBeDefined();
        });

        expect(formState.errors.email.message).toBe(Errors.EMAIL_INVALID);
    });

    it('shows validation error for non .com email', async () => {
        let formState: any;

        const TestComponent = () => {
            const methods = useForm({
                defaultValues: { email: 'test@test.org', password: '123456' },
                resolver: zodResolver(mockLoginSchema),
                mode: 'onChange',
            });
            formState = methods.formState;

            React.useEffect(() => {
                methods.trigger();
            }, [methods]);

            return (
                <FormProvider {...methods}>
                    <LoginPage />
                </FormProvider>
            );
        };

        render(<TestComponent />);

        await waitFor(() => {
            expect(formState.errors).toBeDefined();
            expect(formState.errors.email).toBeDefined();
        });

        expect(formState.errors.email.message).toBe(Errors.IS_NOT_EMAIL);
    });

    it('shows validation error for missing password', async () => {
        let formState: any;

        const TestComponent = () => {
            const methods = useForm({
                defaultValues: { email: 'test@test.com', password: '' },
                resolver: zodResolver(mockLoginSchema),
                mode: 'onChange',
            });
            formState = methods.formState;

            React.useEffect(() => {
                methods.trigger();
            }, [methods]);

            return (
                <FormProvider {...methods}>
                    <LoginPage />
                </FormProvider>
            );
        };

        render(<TestComponent />);

        await waitFor(() => {
            expect(formState.errors).toBeDefined();
            expect(formState.errors.password).toBeDefined();
        });

        expect(formState.errors.password.message).toBe(Errors.REQUIRED_PASSWORD_INPUT);
    });
});
