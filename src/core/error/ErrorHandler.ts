/**
 * Unified error handler for the entire application
 * Handles error categorization, logging, recovery, and user feedback
 */

import axios, { AxiosError } from 'axios';

import {
    AppError,
    AuthError,
    EncryptionError,
    ErrorCode,
    ErrorContext,
    ErrorSeverity,
    HttpError,
    NetworkError,
    RequestCancelledError,
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
            return UnifiedErrorHandler.instance;
        }

        // The module-level getInstance() call at the bottom of this file constructs the
        // instance before any caller can configure it, so a later getInstance({...})
        // used to drop its config without a word — onAuthError never wired, Sentry
        // never enabled. Warn and point at the method that does work.
        if (config) {
            Logger.warn(
                'ErrorHandler',
                'getInstance() called with config after the instance already exists; config ignored. Use updateConfig() instead.'
            );
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
     * Categorize error into specific AppError type
     */
    private categorizeError(error: unknown, context?: Partial<ErrorContext>): AppError {
        // Already an AppError. Merge the caller's context instead of discarding it —
        // httpClient passes { endpoint, method }, which would otherwise never reach an
        // error the interceptor had already typed.
        if (error instanceof AppError) {
            if (context) {
                Object.assign(error.context, { ...context, ...error.context });
            }
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

        // Cancellation first: axios reports it as an AxiosError with no `.response` and
        // code ERR_CANCELED, so the network branch below would otherwise claim it. A
        // request the app deliberately abandoned is not a connectivity failure, and
        // treating it as one makes every navigate-away a retryable HIGH-severity alert.
        if (axios.isCancel(error) || error.code === 'ERR_CANCELED') {
            return new RequestCancelledError(message, errorContext);
        }

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
            return new ValidationError(message, {}, { ...context, originalError: error });
        }

        if (error.name === 'SchemaValidationError' || message.includes('schema')) {
            return new SchemaValidationError(message, [], { ...context, originalError: error });
        }

        if (error.name === 'StorageError' || message.includes('storage')) {
            return new StorageError(message, { ...context, originalError: error });
        }

        if (error.name === 'EncryptionError' || message.includes('encryption')) {
            return new EncryptionError(message, { ...context, originalError: error });
        }

        // Specific before generic: 'auth token expired' contains both 'auth' and
        // 'token expired'. With the generic test first it became an AuthError, which
        // leaves shouldLogout unset, instead of a TokenExpiredError, which sets it.
        if (error.name === 'TokenExpiredError' || message.includes('token expired')) {
            return new TokenExpiredError(message, { ...context, originalError: error });
        }

        if (error.name === 'AuthError' || message.includes('auth')) {
            return new AuthError(message, { ...context, originalError: error });
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
        if ((error instanceof AuthError || error instanceof TokenExpiredError) && this.config.onAuthError) {
            this.config.onAuthError(error);
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
     * Longest response body still plausibly written for a human to read. A real API error
     * string ("Invalid credentials") is far below this; a rendered page or a stack trace is
     * far above it.
     */
    private static readonly MAX_PRESENTABLE_MESSAGE_LENGTH = 200;

    /**
     * Whether a string response body can be shown to a user as-is.
     *
     * A failing request does not always come from the API. Gateways, proxies and load
     * balancers answer with an HTML page, and returning that verbatim put the whole nginx
     * error document on screen — including the server version and OS — with the app's own
     * "Error Occurred" heading above it. Reproduced on device against a 502.
     *
     * So a string body is only trusted when it looks like prose rather than markup, and is
     * short enough to have been written as a message rather than rendered as a document.
     * Rejecting it falls back to `error.message` and then to a generic string, which are
     * both safe to display.
     */
    private isPresentableMessage(value: string): boolean {
        const trimmed = value.trim();

        if (!trimmed || trimmed.length > UnifiedErrorHandler.MAX_PRESENTABLE_MESSAGE_LENGTH) {
            return false;
        }

        // Markup or a document preamble: `<html>`, `<!DOCTYPE …>`, `<?xml …?>`. Checking the
        // first character alone would miss a leading newline, which nginx and Apache both emit.
        return !/^[<]/.test(trimmed) && !/<\/?[a-z!?]/i.test(trimmed);
    }

    /**
     * Extract error message from various sources
     */
    private extractErrorMessage(data: any): string | null {
        if (!data) return null;

        if (typeof data === 'string') {
            return this.isPresentableMessage(data) ? data.trim() : null;
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
