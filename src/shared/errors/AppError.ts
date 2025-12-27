/**
 * Base error class for all application errors
 * Provides consistent error handling, context, and recovery strategies
 */

export enum ErrorCode {
    // Network errors
    NETWORK_ERROR = 'NETWORK_ERROR',
    TIMEOUT_ERROR = 'TIMEOUT_ERROR',
    CONNECTION_REFUSED = 'CONNECTION_REFUSED',

    // HTTP errors
    BAD_REQUEST = 'BAD_REQUEST',
    UNAUTHORIZED = 'UNAUTHORIZED',
    FORBIDDEN = 'FORBIDDEN',
    NOT_FOUND = 'NOT_FOUND',
    CONFLICT = 'CONFLICT',
    RATE_LIMITED = 'RATE_LIMITED',
    SERVER_ERROR = 'SERVER_ERROR',
    SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',

    // Validation errors
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    INVALID_INPUT = 'INVALID_INPUT',
    SCHEMA_VALIDATION_ERROR = 'SCHEMA_VALIDATION_ERROR',

    // Auth errors
    AUTH_ERROR = 'AUTH_ERROR',
    TOKEN_EXPIRED = 'TOKEN_EXPIRED',
    TOKEN_INVALID = 'TOKEN_INVALID',
    UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',

    // Storage errors
    STORAGE_ERROR = 'STORAGE_ERROR',
    ENCRYPTION_ERROR = 'ENCRYPTION_ERROR',

    // Unknown errors
    UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export enum ErrorSeverity {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH',
    CRITICAL = 'CRITICAL',
}

export interface ErrorContext {
    endpoint?: string;
    method?: string;
    statusCode?: number;
    timestamp: number;
    userId?: string;
    requestId?: string;
    userAgent?: string;
    breadcrumbs?: string[];
    originalError?: Error;
    [key: string]: any;
}

export interface ErrorRecoveryStrategy {
    shouldRetry: boolean;
    retryCount?: number;
    retryDelay?: number;
    shouldLogout?: boolean;
    shouldShowAlert?: boolean;
    fallbackAction?: () => void;
}

/**
 * Base application error class
 * All errors in the app should extend this class
 */
export class AppError extends Error {
    public readonly code: ErrorCode;
    public readonly severity: ErrorSeverity;
    public readonly context: ErrorContext;
    public readonly recoveryStrategy: ErrorRecoveryStrategy;

    constructor(
        message: string,
        code: ErrorCode = ErrorCode.UNKNOWN_ERROR,
        severity: ErrorSeverity = ErrorSeverity.MEDIUM,
        context: Partial<ErrorContext> = {},
        recoveryStrategy: Partial<ErrorRecoveryStrategy> = {}
    ) {
        super(message);
        this.name = 'AppError';
        this.code = code;
        this.severity = severity;
        this.context = {
            timestamp: Date.now(),
            ...context,
        };
        this.recoveryStrategy = {
            shouldRetry: false,
            shouldLogout: false,
            shouldShowAlert: true,
            ...recoveryStrategy,
        };

        // Maintain proper prototype chain
        Object.setPrototypeOf(this, AppError.prototype);
    }

    /**
     * Serialize error for logging/tracking
     */
    toJSON() {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            severity: this.severity,
            context: this.context,
            recoveryStrategy: this.recoveryStrategy,
            stack: this.stack,
        };
    }

    /**
     * Get user-friendly error message
     */
    getUserMessage(): string {
        const messages: Record<ErrorCode, string> = {
            [ErrorCode.NETWORK_ERROR]: 'Network connection failed. Please check your internet connection.',
            [ErrorCode.TIMEOUT_ERROR]: 'Request timed out. Please try again.',
            [ErrorCode.CONNECTION_REFUSED]: 'Unable to connect to server. Please try again later.',
            [ErrorCode.BAD_REQUEST]: 'Invalid request. Please check your input.',
            [ErrorCode.UNAUTHORIZED]: 'Unauthorized. Please log in again.',
            [ErrorCode.FORBIDDEN]: 'You do not have permission to access this resource.',
            [ErrorCode.NOT_FOUND]: 'Resource not found.',
            [ErrorCode.CONFLICT]: 'Resource conflict. Please refresh and try again.',
            [ErrorCode.RATE_LIMITED]: 'Too many requests. Please wait a moment and try again.',
            [ErrorCode.SERVER_ERROR]: 'Server error. Please try again later.',
            [ErrorCode.SERVICE_UNAVAILABLE]: 'Service temporarily unavailable. Please try again later.',
            [ErrorCode.VALIDATION_ERROR]: 'Validation failed. Please check your input.',
            [ErrorCode.INVALID_INPUT]: 'Invalid input provided.',
            [ErrorCode.SCHEMA_VALIDATION_ERROR]: 'Data validation failed.',
            [ErrorCode.AUTH_ERROR]: 'Authentication failed. Please try again.',
            [ErrorCode.TOKEN_EXPIRED]: 'Your session has expired. Please log in again.',
            [ErrorCode.TOKEN_INVALID]: 'Invalid session. Please log in again.',
            [ErrorCode.UNAUTHORIZED_ACCESS]: 'Unauthorized access.',
            [ErrorCode.STORAGE_ERROR]: 'Storage error. Please try again.',
            [ErrorCode.ENCRYPTION_ERROR]: 'Encryption error. Please try again.',
            [ErrorCode.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again.',
        };

        return messages[this.code] || this.message;
    }
}

/**
 * Network error - connection issues
 */
export class NetworkError extends AppError {
    constructor(message: string, context?: Partial<ErrorContext>) {
        super(message, ErrorCode.NETWORK_ERROR, ErrorSeverity.HIGH, context, {
            shouldRetry: true,
            retryCount: 3,
            retryDelay: 1000,
            shouldShowAlert: true,
        });
        this.name = 'NetworkError';
        Object.setPrototypeOf(this, NetworkError.prototype);
    }
}

/**
 * Timeout error - request took too long
 */
export class TimeoutError extends AppError {
    constructor(message: string, context?: Partial<ErrorContext>) {
        super(message, ErrorCode.TIMEOUT_ERROR, ErrorSeverity.MEDIUM, context, {
            shouldRetry: true,
            retryCount: 2,
            retryDelay: 2000,
            shouldShowAlert: true,
        });
        this.name = 'TimeoutError';
        Object.setPrototypeOf(this, TimeoutError.prototype);
    }
}

/**
 * Validation error - input validation failed
 */
export class ValidationError extends AppError {
    public readonly errors: Record<string, string[]>;

    constructor(message: string, errors: Record<string, string[]> = {}, context?: Partial<ErrorContext>) {
        super(message, ErrorCode.VALIDATION_ERROR, ErrorSeverity.LOW, context, {
            shouldRetry: false,
            shouldShowAlert: true,
        });
        this.name = 'ValidationError';
        this.errors = errors;
        Object.setPrototypeOf(this, ValidationError.prototype);
    }
}

/**
 * Schema validation error - Zod schema validation failed
 */
export class SchemaValidationError extends AppError {
    public readonly errors: any[];

    constructor(message: string, errors: any[] = [], context?: Partial<ErrorContext>) {
        super(message, ErrorCode.SCHEMA_VALIDATION_ERROR, ErrorSeverity.MEDIUM, context, {
            shouldRetry: false,
            shouldShowAlert: false,
        });
        this.name = 'SchemaValidationError';
        this.errors = errors;
        Object.setPrototypeOf(this, SchemaValidationError.prototype);
    }
}

/**
 * Authentication error - auth failed
 */
export class AuthError extends AppError {
    constructor(message: string, context?: Partial<ErrorContext>) {
        super(message, ErrorCode.AUTH_ERROR, ErrorSeverity.HIGH, context, {
            shouldRetry: false,
            shouldShowAlert: true,
        });
        this.name = 'AuthError';
        Object.setPrototypeOf(this, AuthError.prototype);
    }
}

/**
 * Token expired error - JWT token expired
 */
export class TokenExpiredError extends AppError {
    constructor(message: string, context?: Partial<ErrorContext>) {
        super(message, ErrorCode.TOKEN_EXPIRED, ErrorSeverity.HIGH, context, {
            shouldRetry: true,
            retryCount: 1,
            shouldLogout: true,
            shouldShowAlert: true,
        });
        this.name = 'TokenExpiredError';
        Object.setPrototypeOf(this, TokenExpiredError.prototype);
    }
}

/**
 * HTTP error - server returned error status
 */
export class HttpError extends AppError {
    public readonly statusCode: number;
    public readonly responseData?: any;

    constructor(message: string, statusCode: number, responseData?: any, context?: Partial<ErrorContext>) {
        const code = getErrorCodeFromStatus(statusCode);
        const severity = getErrorSeverityFromStatus(statusCode);

        super(message, code, severity, { ...context, statusCode }, getRecoveryStrategyFromStatus(statusCode));

        this.name = 'HttpError';
        this.statusCode = statusCode;
        this.responseData = responseData;
        Object.setPrototypeOf(this, HttpError.prototype);
    }
}

/**
 * Storage error - local storage operation failed
 */
export class StorageError extends AppError {
    constructor(message: string, context?: Partial<ErrorContext>) {
        super(message, ErrorCode.STORAGE_ERROR, ErrorSeverity.HIGH, context, {
            shouldRetry: true,
            retryCount: 2,
            shouldShowAlert: true,
        });
        this.name = 'StorageError';
        Object.setPrototypeOf(this, StorageError.prototype);
    }
}

/**
 * Encryption error - encryption/decryption failed
 */
export class EncryptionError extends AppError {
    constructor(message: string, context?: Partial<ErrorContext>) {
        super(message, ErrorCode.ENCRYPTION_ERROR, ErrorSeverity.CRITICAL, context, {
            shouldRetry: false,
            shouldShowAlert: true,
        });
        this.name = 'EncryptionError';
        Object.setPrototypeOf(this, EncryptionError.prototype);
    }
}

/**
 * Helper function to get error code from HTTP status
 */
function getErrorCodeFromStatus(status: number): ErrorCode {
    switch (status) {
        case 400:
            return ErrorCode.BAD_REQUEST;
        case 401:
            return ErrorCode.UNAUTHORIZED;
        case 403:
            return ErrorCode.FORBIDDEN;
        case 404:
            return ErrorCode.NOT_FOUND;
        case 409:
            return ErrorCode.CONFLICT;
        case 429:
            return ErrorCode.RATE_LIMITED;
        case 500:
        case 502:
        case 504:
            return ErrorCode.SERVER_ERROR;
        case 503:
            return ErrorCode.SERVICE_UNAVAILABLE;
        default:
            return ErrorCode.UNKNOWN_ERROR;
    }
}

/**
 * Helper function to get error severity from HTTP status
 */
function getErrorSeverityFromStatus(status: number): ErrorSeverity {
    if (status >= 500) return ErrorSeverity.HIGH;
    if (status >= 400) return ErrorSeverity.MEDIUM;
    return ErrorSeverity.LOW;
}

/**
 * Helper function to get recovery strategy from HTTP status
 */
function getRecoveryStrategyFromStatus(status: number): Partial<ErrorRecoveryStrategy> {
    switch (status) {
        case 401:
            return {
                shouldRetry: false,
                shouldLogout: true,
                shouldShowAlert: true,
            };
        case 429:
            return {
                shouldRetry: true,
                retryCount: 3,
                retryDelay: 5000,
                shouldShowAlert: true,
            };
        case 500:
        case 502:
        case 503:
        case 504:
            return {
                shouldRetry: true,
                retryCount: 3,
                retryDelay: 2000,
                shouldShowAlert: true,
            };
        default:
            return {
                shouldRetry: false,
                shouldShowAlert: true,
            };
    }
}
