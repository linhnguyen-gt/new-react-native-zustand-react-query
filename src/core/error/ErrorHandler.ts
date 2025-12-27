/**
 * Unified error handler for the entire application
 * Handles error categorization, logging, recovery, and user feedback
 */

import { AxiosError } from 'axios';

import {
    AppError,
    AuthError,
    EncryptionError,
    ErrorCode,
    ErrorContext,
    ErrorSeverity,
    HttpError,
    NetworkError,
    SchemaValidationError,
    StorageError,
    TimeoutError,
    TokenExpiredError,
    ValidationError,
} from '@/shared/errors';
import { Logger } from '@/shared/helper';

export interface ErrorHandlerConfig {
    enableSentry?: boolean;
    enableConsoleLogging?: boolean;
    enableBreadcrumbs?: boolean;
    onError?: (error: AppError) => void;
    onAuthError?: (error: AuthError | TokenExpiredError) => void;
    onNetworkError?: (error: NetworkError | TimeoutError) => void;
}

/**
 * Unified error handler
 * Replaces multiple error handling patterns with single, consistent approach
 */
export class UnifiedErrorHandler {
    private static instance: UnifiedErrorHandler;
    private config: ErrorHandlerConfig;
    private breadcrumbs: Array<{ message: string; timestamp: number }> = [];
    private readonly maxBreadcrumbs = 50;

    private constructor(config: ErrorHandlerConfig = {}) {
        this.config = {
            enableSentry: false,
            enableConsoleLogging: true,
            enableBreadcrumbs: true,
            ...config,
        };
    }

    /**
     * Get singleton instance
     */
    static getInstance(config?: ErrorHandlerConfig): UnifiedErrorHandler {
        if (!UnifiedErrorHandler.instance) {
            UnifiedErrorHandler.instance = new UnifiedErrorHandler(config);
        }
        return UnifiedErrorHandler.instance;
    }

    /**
     * Reset singleton instance (for testing)
     */
    static resetInstance(): void {
        UnifiedErrorHandler.instance = null as any;
    }

    /**
     * Handle any error and convert to AppError
     */
    handle(error: unknown, context?: Partial<ErrorContext>): AppError {
        const appError = this.categorizeError(error, context);
        this.processError(appError);
        return appError;
    }

    /**
     * Handle error and throw it
     */
    handleAndThrow(_error: unknown, context?: Partial<ErrorContext>): never {
        const appError = this.handle(_error, context);
        throw appError;
    }

    /**
     * Categorize error into specific AppError type
     */
    private categorizeError(error: unknown, context?: Partial<ErrorContext>): AppError {
        // Already an AppError
        if (error instanceof AppError) {
            return error;
        }

        // Axios error (HTTP)
        if (error instanceof AxiosError) {
            return this.handleAxiosError(error, context);
        }

        // Native Error
        if (error instanceof Error) {
            return this.handleNativeError(error, context);
        }

        // Unknown error
        return new AppError(String(error), ErrorCode.UNKNOWN_ERROR, ErrorSeverity.MEDIUM, context);
    }

    /**
     * Handle Axios errors
     */
    private handleAxiosError(error: AxiosError, context?: Partial<ErrorContext>): AppError {
        const status = error.response?.status || 0;
        const data = error.response?.data;
        const message = this.extractErrorMessage(data) || error.message || 'HTTP request failed';

        const errorContext: Partial<ErrorContext> = {
            endpoint: error.config?.url,
            method: error.config?.method?.toUpperCase(),
            statusCode: status,
            ...context,
        };

        // Network errors
        if (!error.response) {
            if (error.code === 'ECONNABORTED') {
                return new TimeoutError(message, errorContext);
            }
            return new NetworkError(message, errorContext);
        }

        // HTTP errors
        return new HttpError(message, status, data, errorContext);
    }

    /**
     * Handle native JavaScript errors
     */
    private handleNativeError(error: Error, context?: Partial<ErrorContext>): AppError {
        const message = error.message || 'Unknown error';

        // Detect error type from message or name
        if (error.name === 'ValidationError' || message.includes('validation')) {
            return new ValidationError(message, {}, context);
        }

        if (error.name === 'SchemaValidationError' || message.includes('schema')) {
            return new SchemaValidationError(message, [], context);
        }

        if (error.name === 'StorageError' || message.includes('storage')) {
            return new StorageError(message, context);
        }

        if (error.name === 'EncryptionError' || message.includes('encryption')) {
            return new EncryptionError(message, context);
        }

        if (error.name === 'AuthError' || message.includes('auth')) {
            return new AuthError(message, context);
        }

        if (error.name === 'TokenExpiredError' || message.includes('token expired')) {
            return new TokenExpiredError(message, context);
        }

        // Generic error
        return new AppError(message, ErrorCode.UNKNOWN_ERROR, ErrorSeverity.MEDIUM, {
            ...context,
            originalError: error,
        });
    }

    /**
     * Process error: log, track, notify
     */
    private processError(error: AppError): void {
        // Add breadcrumb
        if (this.config.enableBreadcrumbs) {
            this.addBreadcrumb(`Error: ${error.code} - ${error.message}`);
        }

        // Log error
        if (this.config.enableConsoleLogging) {
            this.logError(error);
        }

        // Send to Sentry
        if (this.config.enableSentry) {
            this.sendToSentry(error);
        }

        // Call custom error handler
        if (this.config.onError) {
            this.config.onError(error);
        }

        // Call specific handlers
        if (error instanceof AuthError || error instanceof TokenExpiredError) {
            if (error instanceof TokenExpiredError && this.config.onAuthError) {
                this.config.onAuthError(error);
            } else if (error instanceof AuthError && this.config.onAuthError) {
                this.config.onAuthError(error);
            }
        }

        if (error instanceof NetworkError || error instanceof TimeoutError) {
            if (this.config.onNetworkError) {
                this.config.onNetworkError(error);
            }
        }
    }

    /**
     * Log error with context
     */
    private logError(error: AppError): void {
        const logData = {
            code: error.code,
            severity: error.severity,
            message: error.message,
            context: error.context,
            recoveryStrategy: error.recoveryStrategy,
            breadcrumbs: this.breadcrumbs,
        };

        switch (error.severity) {
            case ErrorSeverity.CRITICAL:
            case ErrorSeverity.HIGH:
                Logger.error('UnifiedErrorHandler', logData);
                break;
            case ErrorSeverity.MEDIUM:
                Logger.warn('UnifiedErrorHandler', logData);
                break;
            case ErrorSeverity.LOW:
                Logger.info('UnifiedErrorHandler', logData);
                break;
        }
    }

    /**
     * Send error to Sentry (placeholder)
     */
    private sendToSentry(_error: AppError): void {
        // TODO: Implement Sentry integration
        // Sentry.captureException(error, {
        //     level: error.severity.toLowerCase() as SeverityLevel,
        //     tags: {
        //         errorCode: error.code,
        //     },
        //     contexts: {
        //         app: error.context,
        //     },
        // });
    }

    /**
     * Add breadcrumb for error tracking
     */
    addBreadcrumb(message: string): void {
        this.breadcrumbs.push({
            message,
            timestamp: Date.now(),
        });

        // Keep only last N breadcrumbs
        if (this.breadcrumbs.length > this.maxBreadcrumbs) {
            this.breadcrumbs.shift();
        }
    }

    /**
     * Get all breadcrumbs
     */
    getBreadcrumbs(): Array<{ message: string; timestamp: number }> {
        return [...this.breadcrumbs];
    }

    /**
     * Clear breadcrumbs
     */
    clearBreadcrumbs(): void {
        this.breadcrumbs = [];
    }

    /**
     * Extract error message from various sources
     */
    private extractErrorMessage(data: any): string | null {
        if (!data) return null;

        if (typeof data === 'string') {
            return data;
        }

        if (data instanceof Error) {
            return data.message;
        }

        if (typeof data === 'object') {
            return data.message || data.error || data.msg || data.detail || data.description || JSON.stringify(data);
        }

        return String(data);
    }

    /**
     * Update configuration
     */
    updateConfig(config: Partial<ErrorHandlerConfig>): void {
        this.config = { ...this.config, ...config };
    }
}

/**
 * Export singleton instance
 */
export const errorHandler = UnifiedErrorHandler.getInstance();
