import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Control, useForm } from 'react-hook-form';

import { Box, Text } from '../../ui';
import ControlledInput from '../ControlledInput';

interface TestFormData {
    testField: string;
    email: string;
    password: string;
}

const TestWrapper = ({
    children,
    defaultValues = {},
}: {
    children: (control: Control<TestFormData>) => React.ReactNode;
    defaultValues?: Partial<TestFormData>;
}) => {
    const { control } = useForm<TestFormData>({
        defaultValues: {
            testField: '',
            email: '',
            password: '',
            ...defaultValues,
        },
    });

    return <>{children(control)}</>;
};

describe('ControlledInput', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders with basic props', () => {
        render(
            <TestWrapper>
                {(control) => (
                    <ControlledInput name="testField" control={control} placeholder="Enter text" testID="test-input" />
                )}
            </TestWrapper>
        );

        expect(screen.getByTestId('test-input')).toBeTruthy();
        expect(screen.getByPlaceholderText('Enter text')).toBeTruthy();
    });

    it('displays the current value from form control', () => {
        render(
            <TestWrapper defaultValues={{ testField: 'initial value' }}>
                {(control) => <ControlledInput name="testField" control={control} testID="test-input" />}
            </TestWrapper>
        );

        expect(screen.getByDisplayValue('initial value')).toBeTruthy();
    });

    it('calls onChange when text is entered', async () => {
        render(
            <TestWrapper>
                {(control) => <ControlledInput name="testField" control={control} testID="test-input" />}
            </TestWrapper>
        );

        const input = screen.getByTestId('test-input');

        await act(async () => {
            fireEvent.changeText(input, 'new value');
        });

        expect(screen.getByDisplayValue('new value')).toBeTruthy();
    });

    it('calls onBlur when input loses focus', async () => {
        render(
            <TestWrapper>
                {(control) => <ControlledInput name="testField" control={control} testID="test-input" />}
            </TestWrapper>
        );

        const input = screen.getByTestId('test-input');

        await act(async () => {
            fireEvent(input, 'blur');
        });

        expect(input).toBeTruthy();
    });

    it('displays external error when provided', () => {
        render(
            <TestWrapper>
                {(control) => (
                    <ControlledInput
                        name="testField"
                        control={control}
                        error="External error message"
                        testID="test-input"
                    />
                )}
            </TestWrapper>
        );

        expect(screen.getByText('External error message')).toBeTruthy();
        expect(screen.getByTestId('test-input-error')).toBeTruthy();
    });

    it('displays field error when shouldUseFieldError is true and field has error', async () => {
        const TestComponentWithValidation = () => {
            const { control } = useForm<TestFormData>({
                defaultValues: { testField: '' },
                mode: 'onChange',
            });

            return (
                <ControlledInput
                    name="testField"
                    control={control}
                    shouldUseFieldError={true}
                    rules={{ required: 'Field is required' }}
                    testID="test-input"
                />
            );
        };

        render(<TestComponentWithValidation />);

        const input = screen.getByTestId('test-input');

        await act(async () => {
            fireEvent.changeText(input, '');
            fireEvent(input, 'blur');
        });

        await waitFor(() => {
            expect(screen.getByText('Field is required')).toBeTruthy();
        });
    });

    it('prioritizes external error over field error when both are present', () => {
        const TestComponentWithBothErrors = () => {
            const { control } = useForm<TestFormData>({
                defaultValues: { testField: '' },
                mode: 'onChange',
            });

            return (
                <ControlledInput
                    name="testField"
                    control={control}
                    error="External error"
                    shouldUseFieldError={true}
                    rules={{ required: 'Field is required' }}
                    testID="test-input"
                />
            );
        };

        render(<TestComponentWithBothErrors />);

        expect(screen.getByText('External error')).toBeTruthy();
        expect(screen.queryByText('Field is required')).toBeFalsy();
    });

    it('does not display field error when shouldUseFieldError is false', async () => {
        const TestComponentWithoutFieldError = () => {
            const { control } = useForm<TestFormData>({
                defaultValues: { testField: '' },
                mode: 'onChange',
            });

            return (
                <ControlledInput
                    name="testField"
                    control={control}
                    shouldUseFieldError={false}
                    rules={{ required: 'Field is required' }}
                    testID="test-input"
                />
            );
        };

        render(<TestComponentWithoutFieldError />);

        const input = screen.getByTestId('test-input');

        await act(async () => {
            fireEvent.changeText(input, '');
            fireEvent(input, 'blur');
        });

        expect(screen.queryByText('Field is required')).toBeFalsy();
    });

    it('passes through all Input props except controlled ones', () => {
        render(
            <TestWrapper>
                {(control) => (
                    <ControlledInput
                        name="testField"
                        control={control}
                        placeholder="Enter email"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        testID="email-input"
                    />
                )}
            </TestWrapper>
        );

        const input = screen.getByTestId('email-input');
        expect(input).toBeTruthy();
        expect(screen.getByPlaceholderText('Enter email')).toBeTruthy();
    });

    it('handles password field correctly', () => {
        render(
            <TestWrapper>
                {(control) => (
                    <ControlledInput
                        name="password"
                        control={control}
                        placeholder="Enter password"
                        isPassword={true}
                        testID="password-input"
                    />
                )}
            </TestWrapper>
        );

        expect(screen.getByTestId('password-input')).toBeTruthy();
        expect(screen.getByPlaceholderText('Enter password')).toBeTruthy();
    });

    it('handles title prop correctly', () => {
        render(
            <TestWrapper>
                {(control) => (
                    <ControlledInput name="testField" control={control} title="Test Field Label" testID="test-input" />
                )}
            </TestWrapper>
        );

        expect(screen.getByText('Test Field Label')).toBeTruthy();
    });

    it('handles prefix and suffix icons', () => {
        const prefixIcon = (
            <Box testID="prefix-icon">
                <Text>@</Text>
            </Box>
        );
        const suffixIcon = (
            <Box testID="suffix-icon">
                <Text>✓</Text>
            </Box>
        );

        render(
            <TestWrapper>
                {(control) => (
                    <ControlledInput
                        name="testField"
                        control={control}
                        prefixIcon={prefixIcon}
                        suffixIcon={suffixIcon}
                        testID="test-input"
                    />
                )}
            </TestWrapper>
        );

        expect(screen.getByTestId('prefix-icon')).toBeTruthy();
        expect(screen.getByTestId('suffix-icon')).toBeTruthy();
    });

    it('handles disabled state', () => {
        render(
            <TestWrapper>
                {(control) => <ControlledInput name="testField" control={control} enable={false} testID="test-input" />}
            </TestWrapper>
        );

        const input = screen.getByTestId('test-input');
        expect(input.props.editable).toBe(false);
    });

    it('handles custom height', () => {
        render(
            <TestWrapper>
                {(control) => <ControlledInput name="testField" control={control} height={60} testID="test-input" />}
            </TestWrapper>
        );

        expect(screen.getByTestId('test-input')).toBeTruthy();
    });

    it('handles loading state', () => {
        render(
            <TestWrapper>
                {(control) => (
                    <ControlledInput name="testField" control={control} isLoading={true} testID="test-input" />
                )}
            </TestWrapper>
        );

        expect(screen.getByTestId('test-input')).toBeTruthy();
    });

    it('works with different field types', () => {
        render(
            <TestWrapper>
                {(control) => (
                    <>
                        <ControlledInput
                            name="email"
                            control={control}
                            placeholder="Email"
                            keyboardType="email-address"
                            testID="email-input"
                        />
                        <ControlledInput
                            name="password"
                            control={control}
                            placeholder="Password"
                            isPassword={true}
                            testID="password-input"
                        />
                    </>
                )}
            </TestWrapper>
        );

        expect(screen.getByTestId('email-input')).toBeTruthy();
        expect(screen.getByTestId('password-input')).toBeTruthy();
    });

    it('handles validation rules correctly', async () => {
        const TestComponentWithRules = () => {
            const { control } = useForm<TestFormData>({
                defaultValues: { testField: '' },
                mode: 'onChange',
            });

            return (
                <ControlledInput
                    name="testField"
                    control={control}
                    shouldUseFieldError={true}
                    rules={{
                        required: 'This field is required',
                        minLength: {
                            value: 3,
                            message: 'Minimum 3 characters required',
                        },
                    }}
                    testID="test-input"
                />
            );
        };

        render(<TestComponentWithRules />);

        const input = screen.getByTestId('test-input');

        await act(async () => {
            fireEvent.changeText(input, 'ab');
            fireEvent(input, 'blur');
        });

        await waitFor(() => {
            expect(screen.getByText('Minimum 3 characters required')).toBeTruthy();
        });
    });

    it('clears error when field becomes valid', async () => {
        const TestComponentWithValidation = () => {
            const { control } = useForm<TestFormData>({
                defaultValues: { testField: '' },
                mode: 'onChange',
            });

            return (
                <ControlledInput
                    name="testField"
                    control={control}
                    shouldUseFieldError={true}
                    rules={{ required: 'Field is required' }}
                    testID="test-input"
                />
            );
        };

        render(<TestComponentWithValidation />);

        const input = screen.getByTestId('test-input');

        await act(async () => {
            fireEvent.changeText(input, '');
            fireEvent(input, 'blur');
        });

        await waitFor(() => {
            expect(screen.getByText('Field is required')).toBeTruthy();
        });

        await act(async () => {
            fireEvent.changeText(input, 'valid value');
            fireEvent(input, 'blur');
        });

        await waitFor(() => {
            expect(screen.queryByText('Field is required')).toBeFalsy();
        });
    });
});
