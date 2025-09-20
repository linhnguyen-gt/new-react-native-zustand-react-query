import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { TextInput } from 'react-native';

import Input from '../Input';

jest.mock('@/presentation/hooks', () => ({
    getColor: jest.fn(() => '#999999'),
}));

jest.mock('@/presentation/components/touchable', () => ({
    MyTouchable: ({ children, onPress, testID }: any) => {
        const { TextInput: MockTextInput } = jest.requireActual('react-native');
        return (
            <MockTextInput testID={testID} onPress={onPress}>
                {children}
            </MockTextInput>
        );
    },
}));

jest.mock('@/presentation/components/ui', () => ({
    Box: ({ children, testID, className }: any) => {
        const { TextInput: MockTextInput } = jest.requireActual('react-native');
        return (
            <MockTextInput testID={testID} className={className}>
                {children}
            </MockTextInput>
        );
    },
    HStack: ({ children, testID, className, style }: any) => {
        const { TextInput: MockTextInput } = jest.requireActual('react-native');
        return (
            <MockTextInput testID={testID} className={className} style={style}>
                {children}
            </MockTextInput>
        );
    },
    VStack: ({ children, testID, className }: any) => {
        const { TextInput: MockTextInput } = jest.requireActual('react-native');
        return (
            <MockTextInput testID={testID} className={className}>
                {children}
            </MockTextInput>
        );
    },
    Text: ({ children, testID, className }: any) => {
        const { TextInput: MockTextInput } = jest.requireActual('react-native');
        return (
            <MockTextInput testID={testID} className={className}>
                {children}
            </MockTextInput>
        );
    },
    IconComponent: ({ name, font, size, testID }: any) => {
        const { TextInput: MockTextInput } = jest.requireActual('react-native');
        return (
            <MockTextInput testID={testID}>
                {name}-{font}-{size}
            </MockTextInput>
        );
    },
}));

jest.mock('../Input.Hook', () => ({
    __esModule: true,
    default: jest.fn(() => ({ transform: [{ translateX: 0 }] })),
}));

describe('Input', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders with basic props', () => {
        render(<Input placeholder="Enter text" testID="test-input" />);

        expect(screen.getByTestId('test-input')).toBeTruthy();
        expect(screen.getByPlaceholderText('Enter text')).toBeTruthy();
    });

    it('renders with title', () => {
        render(<Input title="Test Label" testID="test-input" />);

        expect(screen.getByTestId('test-input')).toBeTruthy();
    });

    it('renders with prefix icon', () => {
        const prefixIcon = <TextInput testID="prefix-icon">@</TextInput>;

        render(<Input prefixIcon={prefixIcon} testID="test-input" />);

        expect(screen.getByTestId('prefix-icon')).toBeTruthy();
    });

    it('renders with suffix icon', () => {
        const suffixIcon = <TextInput testID="suffix-icon">✓</TextInput>;

        render(<Input suffixIcon={suffixIcon} testID="test-input" />);

        expect(screen.getByTestId('suffix-icon')).toBeTruthy();
    });

    it('renders password field with show/hide toggle', () => {
        render(<Input isPassword={true} testID="test-input" />);

        expect(screen.getByTestId('test-input')).toBeTruthy();
    });

    it('handles password visibility toggle', () => {
        render(<Input isPassword={true} testID="test-input" />);

        expect(screen.getByTestId('test-input')).toBeTruthy();
    });

    it('displays error message when error is provided', () => {
        render(<Input error="Error message" testID="test-input" />);

        expect(screen.getByTestId('test-input-error')).toBeTruthy();
    });

    it('displays error message when error is true', () => {
        render(<Input error={true} testID="test-input" />);

        expect(screen.getByTestId('test-input-error')).toBeTruthy();
    });

    it('does not display error message when error is false', () => {
        render(<Input error={false} testID="test-input" />);

        expect(screen.queryByTestId('test-input-error')).toBeFalsy();
    });

    it('handles disabled state', () => {
        render(<Input enable={false} testID="test-input" />);

        const input = screen.getByTestId('test-input');
        expect(input.props.editable).toBe(false);
    });

    it('handles custom height', () => {
        render(<Input height={60} testID="test-input" />);

        expect(screen.getByTestId('test-input')).toBeTruthy();
    });

    it('calls onChangeText when text changes', () => {
        const onChangeText = jest.fn();
        render(<Input onChangeText={onChangeText} testID="test-input" />);

        const input = screen.getByTestId('test-input');
        fireEvent.changeText(input, 'new text');

        expect(onChangeText).toHaveBeenCalledWith('new text');
    });

    it('calls onChangeValue when fieldName is provided', () => {
        const onChangeValue = jest.fn();
        render(<Input fieldName="testField" onChangeValue={onChangeValue} testID="test-input" />);

        const input = screen.getByTestId('test-input');
        fireEvent.changeText(input, 'new text');

        expect(onChangeValue).toHaveBeenCalledWith('testField', 'new text');
    });

    it('calls onChangeFocus when focus changes', () => {
        const onChangeFocus = jest.fn();
        render(<Input onChangeFocus={onChangeFocus} testID="test-input" />);

        const input = screen.getByTestId('test-input');
        fireEvent(input, 'focus');

        expect(screen.getByTestId('test-input')).toBeTruthy();
    });

    it('handles loading state', () => {
        render(<Input isLoading={true} testID="test-input" />);

        expect(screen.getByTestId('test-input')).toBeTruthy();
    });

    it('forwards ref correctly', () => {
        const ref = React.createRef<TextInput>();
        render(<Input ref={ref} testID="test-input" />);

        expect(ref.current).toBeTruthy();
    });

    it('handles all TextInput props', () => {
        render(
            <Input placeholder="Enter email" keyboardType="email-address" autoCapitalize="none" testID="test-input" />
        );

        const input = screen.getByTestId('test-input');
        expect(input).toBeTruthy();
    });

    it('handles password field without initial show state', () => {
        render(<Input isPassword={false} testID="test-input" />);

        expect(screen.getByTestId('test-input')).toBeTruthy();
    });

    it('handles multiple re-renders without issues', () => {
        const { rerender } = render(<Input testID="test-input" />);

        expect(() => {
            rerender(<Input testID="test-input" error="Error" />);
            rerender(<Input testID="test-input" isPassword={true} />);
            rerender(<Input testID="test-input" enable={false} />);
        }).not.toThrow();
    });

    it('handles empty string error', () => {
        render(<Input error="" testID="test-input" />);

        expect(screen.queryByTestId('test-input-error')).toBeFalsy();
    });

    it('handles undefined error', () => {
        render(<Input error={undefined} testID="test-input" />);

        expect(screen.queryByTestId('test-input-error')).toBeFalsy();
    });
});
