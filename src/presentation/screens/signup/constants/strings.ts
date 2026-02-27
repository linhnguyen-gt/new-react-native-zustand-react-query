/**
 * String constants for the SignUp screen
 * This centralizes all text for easier maintenance and internationalization
 */

export const SignUpStrings = {
    // Screen titles and headers
    title: 'Create Account',
    subtitle: 'Sign up to get started',

    // Form field labels and placeholders
    fullName: {
        label: 'Full Name',
        placeholder: 'Full Name',
        accessibilityLabel: 'Full name input field',
        errorRequired: 'Full name is required',
        errorMinLength: 'Full name must be at least 2 characters',
    },

    email: {
        label: 'Email',
        placeholder: 'Email',
        accessibilityLabel: 'Email input field',
        errorRequired: 'Email is required',
        errorInvalid: 'Please enter a valid email address',
    },

    password: {
        label: 'Password',
        placeholder: 'Password',
        accessibilityLabel: 'Password input field',
        errorRequired: 'Password is required',
        errorMinLength: 'Password must be at least 6 characters',
    },

    confirmPassword: {
        label: 'Confirm Password',
        placeholder: 'Confirm Password',
        accessibilityLabel: 'Confirm password input field',
        errorRequired: 'Please confirm your password',
        errorMismatch: 'Passwords do not match',
    },

    // Buttons
    signUpButton: {
        text: 'Sign Up',
        accessibilityLabel: 'Sign up button',
        loadingText: 'Creating account...',
    },

    signInLink: {
        prompt: 'Already have an account?',
        text: 'Sign In',
        accessibilityLabel: 'Navigate to sign in screen',
    },

    // Accessibility
    logo: {
        accessibilityLabel: 'React Native Logo',
        textAccessibilityLabel: 'RN Logo Text',
    },

    // Success/Error messages
    successMessage: 'Account created successfully!',
    errorMessage: 'Failed to create account. Please try again.',
} as const;

export type SignUpStringsType = typeof SignUpStrings;
