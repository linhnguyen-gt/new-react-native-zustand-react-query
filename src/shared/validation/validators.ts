export const validateToken = (token: string): boolean => {
    return Boolean(token && token.length > 10 && token.length < 1000);
};

export const isTokenExpired = (expiresAt?: number): boolean => {
    if (!expiresAt) return false;
    return Date.now() > expiresAt;
};

export const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

export const validatePassword = (password: string, minLength: number = 6): boolean => {
    return password.length >= minLength;
};

export const validatePasswordMatch = (password: string, confirmPassword: string): boolean => {
    return password === confirmPassword;
};
