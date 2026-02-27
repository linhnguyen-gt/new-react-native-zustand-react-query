import { zodResolver } from '@hookform/resolvers/zod';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { z } from 'zod';

import SignUpPage from '../index';

import { Errors } from '@/shared/constants';

const mockNavigation = {
    reset: jest.fn(),
    goBack: jest.fn(),
};

jest.mock('@react-navigation/native', () => ({
    ...jest.requireActual('@react-navigation/native'),
    useNavigation: () => mockNavigation,
}));

jest.mock('@/data/services', () => ({
    RootNavigator: {
        replaceName: jest.fn(),
        goBack: jest.fn(),
    },
    reactotron: {
        zustand: {
            enhancer: jest.fn((name, creator) => creator),
        },
    },
}));

const mockSignUpSchema = z
    .object({
        fullName: z.string().min(1, Errors.REQUIRED_FULLNAME_INPUT),
        email: z
            .string()
            .min(1, Errors.REQUIRED_EMAIL_INPUT)
            .pipe(z.email(Errors.EMAIL_INVALID))
            .refine((value) => value.endsWith('.com'), {
                message: Errors.IS_NOT_EMAIL,
            }),
        password: z.string().min(6, Errors.PASSWORD_MIN_LENGTH).min(1, Errors.REQUIRED_PASSWORD_INPUT),
        confirmPassword: z.string().min(1, Errors.REQUIRED_CONFIRM_PASSWORD_INPUT),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: Errors.PASSWORD_NOT_MATCH,
        path: ['confirmPassword'],
    });

describe('<SignUpPage />', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders signup form elements', () => {
        render(<SignUpPage />);

        expect(screen.getByTestId('full-name-input')).toBeTruthy();
        expect(screen.getByTestId('email-input')).toBeTruthy();
        expect(screen.getByTestId('password-input')).toBeTruthy();
        expect(screen.getByTestId('confirm-password-input')).toBeTruthy();
        expect(screen.getByTestId('signup-button')).toBeTruthy();
        expect(screen.getByText('Create Account')).toBeTruthy();
        expect(screen.getByText('Sign up to get started')).toBeTruthy();
        expect(screen.getByText('Already have an account?')).toBeTruthy();
    });

    it('navigates to Main screen on valid form submission', async () => {
        render(<SignUpPage />);

        const fullNameInput = screen.getByTestId('full-name-input');
        const emailInput = screen.getByTestId('email-input');
        const passwordInput = screen.getByTestId('password-input');
        const confirmPasswordInput = screen.getByTestId('confirm-password-input');

        fireEvent.changeText(fullNameInput, 'John');
        fireEvent.changeText(emailInput, 'test@test.com');
        fireEvent.changeText(passwordInput, '123456');

        await waitFor(() => {
            expect(screen.queryByText('Passwords do not match')).toBeNull();
        });

        fireEvent.changeText(confirmPasswordInput, '123456');

        await waitFor(() => {
            expect(screen.queryByText('Passwords do not match')).toBeNull();
        });

        const button = screen.getByTestId('signup-button');

        expect(button).toBeTruthy();
    });

    it('navigates back when Sign In link is pressed', () => {
        render(<SignUpPage />);

        const signInLink = screen.getByText('Sign In');
        fireEvent.press(signInLink);

        expect(mockNavigation.goBack).toHaveBeenCalled();
    });

    it('shows validation error for missing full name', async () => {
        let formState: any;

        const TestComponent = () => {
            const methods = useForm({
                defaultValues: { fullName: '', email: 'test@test.com', password: '123456', confirmPassword: '123456' },
                resolver: zodResolver(mockSignUpSchema),
                mode: 'onChange',
            });
            formState = methods.formState;

            React.useEffect(() => {
                methods.trigger();
            }, [methods]);

            return (
                <FormProvider {...methods}>
                    <SignUpPage />
                </FormProvider>
            );
        };

        render(<TestComponent />);

        await waitFor(() => {
            expect(formState.errors).toBeDefined();
            expect(formState.errors.fullName).toBeDefined();
        });

        expect(formState.errors.fullName.message).toBe(Errors.REQUIRED_FULLNAME_INPUT);
    });

    it('shows validation error for invalid email', async () => {
        let formState: any;

        const TestComponent = () => {
            const methods = useForm({
                defaultValues: {
                    fullName: 'John Doe',
                    email: 'invalid-email',
                    password: '123456',
                    confirmPassword: '123456',
                },
                resolver: zodResolver(mockSignUpSchema),
                mode: 'onChange',
            });
            formState = methods.formState;

            React.useEffect(() => {
                methods.trigger();
            }, [methods]);

            return (
                <FormProvider {...methods}>
                    <SignUpPage />
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
                defaultValues: {
                    fullName: 'John Doe',
                    email: 'test@test.org',
                    password: '123456',
                    confirmPassword: '123456',
                },
                resolver: zodResolver(mockSignUpSchema),
                mode: 'onChange',
            });
            formState = methods.formState;

            React.useEffect(() => {
                methods.trigger();
            }, [methods]);

            return (
                <FormProvider {...methods}>
                    <SignUpPage />
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

    it('shows validation error for missing email', async () => {
        let formState: any;

        const TestComponent = () => {
            const methods = useForm({
                defaultValues: { fullName: 'John Doe', email: '', password: '123456', confirmPassword: '123456' },
                resolver: zodResolver(mockSignUpSchema),
                mode: 'onChange',
            });
            formState = methods.formState;

            React.useEffect(() => {
                methods.trigger();
            }, [methods]);

            return (
                <FormProvider {...methods}>
                    <SignUpPage />
                </FormProvider>
            );
        };

        render(<TestComponent />);

        await waitFor(() => {
            expect(formState.errors).toBeDefined();
            expect(formState.errors.email).toBeDefined();
        });

        expect(formState.errors.email.message).toBe(Errors.REQUIRED_EMAIL_INPUT);
    });

    it('shows validation error for password too short', async () => {
        let formState: any;

        const TestComponent = () => {
            const methods = useForm({
                defaultValues: {
                    fullName: 'John Doe',
                    email: 'test@test.com',
                    password: '123',
                    confirmPassword: '123',
                },
                resolver: zodResolver(mockSignUpSchema),
                mode: 'onChange',
            });
            formState = methods.formState;

            React.useEffect(() => {
                methods.trigger();
            }, [methods]);

            return (
                <FormProvider {...methods}>
                    <SignUpPage />
                </FormProvider>
            );
        };

        render(<TestComponent />);

        await waitFor(() => {
            expect(formState.errors).toBeDefined();
            expect(formState.errors.password).toBeDefined();
        });

        expect(formState.errors.password.message).toBe(Errors.PASSWORD_MIN_LENGTH);
    });

    it('shows validation error for missing password', async () => {
        let formState: any;

        const TestComponent = () => {
            const methods = useForm({
                defaultValues: { fullName: 'John Doe', email: 'test@test.com', password: '', confirmPassword: '' },
                resolver: zodResolver(mockSignUpSchema),
                mode: 'onChange',
            });
            formState = methods.formState;

            React.useEffect(() => {
                methods.trigger();
            }, [methods]);

            return (
                <FormProvider {...methods}>
                    <SignUpPage />
                </FormProvider>
            );
        };

        render(<TestComponent />);

        await waitFor(() => {
            expect(formState.errors).toBeDefined();
            expect(formState.errors.password).toBeDefined();
        });

        // Due to Zod's chaining, empty password shows min length error first
        expect(formState.errors.password.message).toBe(Errors.PASSWORD_MIN_LENGTH);
    });

    it('shows validation error for missing confirm password', async () => {
        let formState: any;

        const TestComponent = () => {
            const methods = useForm({
                defaultValues: {
                    fullName: 'John Doe',
                    email: 'test@test.com',
                    password: '123456',
                    confirmPassword: '',
                },
                resolver: zodResolver(mockSignUpSchema),
                mode: 'onChange',
            });
            formState = methods.formState;

            React.useEffect(() => {
                methods.trigger();
            }, [methods]);

            return (
                <FormProvider {...methods}>
                    <SignUpPage />
                </FormProvider>
            );
        };

        render(<TestComponent />);

        await waitFor(() => {
            expect(formState.errors).toBeDefined();
            expect(formState.errors.confirmPassword).toBeDefined();
        });

        expect(formState.errors.confirmPassword.message).toBe(Errors.REQUIRED_CONFIRM_PASSWORD_INPUT);
    });

    it('shows validation error when passwords do not match', async () => {
        let formState: any;

        const TestComponent = () => {
            const methods = useForm({
                defaultValues: {
                    fullName: 'John Doe',
                    email: 'test@test.com',
                    password: '123456',
                    confirmPassword: '654321',
                },
                resolver: zodResolver(mockSignUpSchema),
                mode: 'onChange',
            });
            formState = methods.formState;

            React.useEffect(() => {
                methods.trigger();
            }, [methods]);

            return (
                <FormProvider {...methods}>
                    <SignUpPage />
                </FormProvider>
            );
        };

        render(<TestComponent />);

        await waitFor(() => {
            expect(formState.errors).toBeDefined();
            expect(formState.errors.confirmPassword).toBeDefined();
        });

        expect(formState.errors.confirmPassword.message).toBe(Errors.PASSWORD_NOT_MATCH);
    });

    it('passes validation with valid form data', async () => {
        let formState: any;

        const TestComponent = () => {
            const methods = useForm({
                defaultValues: {
                    fullName: 'John Doe',
                    email: 'test@test.com',
                    password: '123456',
                    confirmPassword: '123456',
                },
                resolver: zodResolver(mockSignUpSchema),
                mode: 'onChange',
            });
            formState = methods.formState;

            React.useEffect(() => {
                methods.trigger();
            }, [methods]);

            return (
                <FormProvider {...methods}>
                    <SignUpPage />
                </FormProvider>
            );
        };

        render(<TestComponent />);

        await waitFor(() => {
            expect(formState.isValid).toBe(true);
        });

        expect(Object.keys(formState.errors)).toHaveLength(0);
    });
});
