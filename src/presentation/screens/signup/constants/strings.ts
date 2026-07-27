/**
 * String constants for the SignUp screen
 * This centralizes all text for easier maintenance and internationalization
 */

export const SignUpStrings = {
    // Screen titles and headers
    title: 'Create Account',
    subtitle: 'Sign up to get started',

    // Form field placeholders and accessibility labels.
    //
    // Validation messages deliberately do NOT live here. `shared/constants/errors.ts`
    // is the single source the zod schemas in `shared/validation/schemas.ts` read
    // from, and the copies that used to sit alongside these fields were read by
    // nothing — a second set of strings free to drift from the ones users actually
    // saw. The `label` fields went the same way: unused, and byte-identical to the
    // placeholder beside them.
    fullName: {
        placeholder: 'Full Name',
        accessibilityLabel: 'Full name input field',
    },

    email: {
        placeholder: 'Email',
        accessibilityLabel: 'Email input field',
    },

    password: {
        placeholder: 'Password',
        accessibilityLabel: 'Password input field',
    },

    confirmPassword: {
        placeholder: 'Confirm Password',
        accessibilityLabel: 'Confirm password input field',
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
