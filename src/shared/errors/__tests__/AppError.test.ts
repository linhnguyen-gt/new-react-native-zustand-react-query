import {
    AppError,
    AuthError,
    EncryptionError,
    ErrorCode,
    ErrorSeverity,
    HttpError,
    NetworkError,
    SchemaValidationError,
    StorageError,
    TimeoutError,
    TokenExpiredError,
    ValidationError,
} from '../AppError';

describe('AppError', () => {
    describe('Base AppError', () => {
        it('should create error with default values', () => {
            const error = new AppError('Test error');

            expect(error.message).toBe('Test error');
            expect(error.code).toBe(ErrorCode.UNKNOWN_ERROR);
            expect(error.severity).toBe(ErrorSeverity.MEDIUM);
            expect(error.context.timestamp).toBeDefined();
        });

        it('should create error with custom values', () => {
            const error = new AppError('Test error', ErrorCode.VALIDATION_ERROR, ErrorSeverity.HIGH, {
                endpoint: '/api/test',
            });

            expect(error.message).toBe('Test error');
            expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
            expect(error.severity).toBe(ErrorSeverity.HIGH);
            expect(error.context.endpoint).toBe('/api/test');
        });

        it('should have recovery strategy', () => {
            const error = new AppError('Test error');

            expect(error.recoveryStrategy).toBeDefined();
            expect(error.recoveryStrategy.shouldRetry).toBe(false);
            expect(error.recoveryStrategy.shouldLogout).toBe(false);
            expect(error.recoveryStrategy.shouldShowAlert).toBe(true);
        });

        it('should serialize to JSON', () => {
            const error = new AppError('Test error', ErrorCode.NETWORK_ERROR);
            const json = error.toJSON();

            expect(json.message).toBe('Test error');
            expect(json.code).toBe(ErrorCode.NETWORK_ERROR);
            expect(json.severity).toBe(ErrorSeverity.MEDIUM);
        });

        it('should get user-friendly message', () => {
            const error = new AppError('Test error', ErrorCode.NETWORK_ERROR);
            const userMessage = error.getUserMessage();

            expect(userMessage).toContain('Network connection failed');
        });
    });

    describe('NetworkError', () => {
        it('should create network error with retry strategy', () => {
            const error = new NetworkError('Connection failed');

            expect(error.code).toBe(ErrorCode.NETWORK_ERROR);
            expect(error.severity).toBe(ErrorSeverity.HIGH);
            expect(error.recoveryStrategy.shouldRetry).toBe(true);
            expect(error.recoveryStrategy.retryCount).toBe(3);
        });
    });

    describe('TimeoutError', () => {
        it('should create timeout error with retry strategy', () => {
            const error = new TimeoutError('Request timeout');

            expect(error.code).toBe(ErrorCode.TIMEOUT_ERROR);
            expect(error.severity).toBe(ErrorSeverity.MEDIUM);
            expect(error.recoveryStrategy.shouldRetry).toBe(true);
            expect(error.recoveryStrategy.retryCount).toBe(2);
        });
    });

    describe('ValidationError', () => {
        it('should create validation error with field errors', () => {
            const errors = {
                email: ['Invalid email format'],
                password: ['Password too short'],
            };
            const error = new ValidationError('Validation failed', errors);

            expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
            expect(error.errors).toEqual(errors);
            expect(error.recoveryStrategy.shouldRetry).toBe(false);
        });
    });

    describe('SchemaValidationError', () => {
        it('should create schema validation error', () => {
            const errors = [{ path: ['email'], message: 'Invalid email' }];
            const error = new SchemaValidationError('Schema validation failed', errors);

            expect(error.code).toBe(ErrorCode.SCHEMA_VALIDATION_ERROR);
            expect(error.errors).toEqual(errors);
            expect(error.recoveryStrategy.shouldShowAlert).toBe(false);
        });
    });

    describe('AuthError', () => {
        it('should create auth error', () => {
            const error = new AuthError('Authentication failed');

            expect(error.code).toBe(ErrorCode.AUTH_ERROR);
            expect(error.severity).toBe(ErrorSeverity.HIGH);
        });
    });

    describe('TokenExpiredError', () => {
        it('should create token expired error with logout strategy', () => {
            const error = new TokenExpiredError('Token expired');

            expect(error.code).toBe(ErrorCode.TOKEN_EXPIRED);
            expect(error.recoveryStrategy.shouldLogout).toBe(true);
            expect(error.recoveryStrategy.shouldRetry).toBe(true);
        });
    });

    describe('HttpError', () => {
        it('should create 400 error', () => {
            const error = new HttpError('Bad request', 400);

            expect(error.code).toBe(ErrorCode.BAD_REQUEST);
            expect(error.statusCode).toBe(400);
        });

        it('should create 401 error with logout strategy', () => {
            const error = new HttpError('Unauthorized', 401);

            expect(error.code).toBe(ErrorCode.UNAUTHORIZED);
            expect(error.recoveryStrategy.shouldLogout).toBe(true);
        });

        it('should create 429 error with retry strategy', () => {
            const error = new HttpError('Too many requests', 429);

            expect(error.code).toBe(ErrorCode.RATE_LIMITED);
            expect(error.recoveryStrategy.shouldRetry).toBe(true);
            expect(error.recoveryStrategy.retryCount).toBe(3);
        });

        it('should create 500 error with retry strategy', () => {
            const error = new HttpError('Server error', 500);

            expect(error.code).toBe(ErrorCode.SERVER_ERROR);
            expect(error.recoveryStrategy.shouldRetry).toBe(true);
        });

        it('should store response data', () => {
            const responseData = { error: 'Invalid input' };
            const error = new HttpError('Bad request', 400, responseData);

            expect(error.responseData).toEqual(responseData);
        });
    });

    describe('StorageError', () => {
        it('should create storage error with retry strategy', () => {
            const error = new StorageError('Storage operation failed');

            expect(error.code).toBe(ErrorCode.STORAGE_ERROR);
            expect(error.recoveryStrategy.shouldRetry).toBe(true);
        });
    });

    describe('EncryptionError', () => {
        it('should create encryption error with critical severity', () => {
            const error = new EncryptionError('Encryption failed');

            expect(error.code).toBe(ErrorCode.ENCRYPTION_ERROR);
            expect(error.severity).toBe(ErrorSeverity.CRITICAL);
            expect(error.recoveryStrategy.shouldRetry).toBe(false);
        });
    });

    describe('Error context', () => {
        it('should preserve context information', () => {
            const context = {
                endpoint: '/api/users',
                method: 'POST',
                userId: 'user123',
            };
            const error = new AppError('Test error', ErrorCode.NETWORK_ERROR, ErrorSeverity.HIGH, context);

            expect(error.context.endpoint).toBe('/api/users');
            expect(error.context.method).toBe('POST');
            expect(error.context.userId).toBe('user123');
            expect(error.context.timestamp).toBeDefined();
        });
    });

    describe('Error instanceof checks', () => {
        it('should be instanceof AppError', () => {
            const error = new NetworkError('Test');
            expect(error instanceof AppError).toBe(true);
            expect(error instanceof NetworkError).toBe(true);
        });

        it('should be instanceof Error', () => {
            const error = new HttpError('Test', 500);
            expect(error instanceof Error).toBe(true);
            expect(error instanceof HttpError).toBe(true);
        });
    });
});
