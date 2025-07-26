const Errors = {
    REQUIRED_EMAIL_INPUT: 'Please enter your email',
    REQUIRED_PASSWORD_INPUT: 'Please enter your password',
    EMAIL_INVALID: 'Invalid email address',
    IS_NOT_EMAIL: 'Email must end with .com',
    REQUIRED_FULLNAME_INPUT: 'Please enter your full name',
    REQUIRED_CONFIRM_PASSWORD_INPUT: 'Please confirm your password',
    PASSWORD_NOT_MATCH: 'Passwords do not match',
    PASSWORD_MIN_LENGTH: 'Password must be at least 6 characters',
} as const;

export default Errors;
