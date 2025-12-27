/**
 * Error recovery strategies
 * Handles automatic recovery from different error types
 */

import { AppError, ErrorCode } from '@/shared/errors';
import { Logger } from '@/shared/helper';

export interface RecoveryResult {
    recovered: boolean;
    action?: string;
    message?: string;
}

/**
 * Error recovery manager
 */
export class ErrorRecoveryManager {
    private static instance: ErrorRecoveryManager;
    private onLogout?: () => Promise<void>;
    private onRetry?: (error: AppError) => Promise<void>;

    private constructor() {}

    /**
     * Get singleton instance
     */
    static getInstance(): ErrorRecoveryManager {
        if (!ErrorRecoveryManager.instance) {
            ErrorRecoveryManager.instance = new ErrorRecoveryManager();
        }
        return ErrorRecoveryManager.instance;
    }

    /**
     * Register logout callback
     */
    setOnLogout(callback: () => Promise<void>): void {
        this.onLogout = callback;
    }

    /**
     * Register retry callback
     */
    setOnRetry(callback: (error: AppError) => Promise<void>): void {
        this.onRetry = callback;
    }

    /**
     * Attempt to recover from error
     */
    async recover(error: AppError): Promise<RecoveryResult> {
        const strategy = error.recoveryStrategy;

        Logger.info('ErrorRecovery', `Attempting recovery for ${error.code}`, {
            shouldRetry: strategy.shouldRetry,
            shouldLogout: strategy.shouldLogout,
        });

        // Handle logout
        if (strategy.shouldLogout) {
            return this.handleLogout(error);
        }

        // Handle retry
        if (strategy.shouldRetry) {
            return this.handleRetry(error);
        }

        // Handle fallback action
        if (strategy.fallbackAction) {
            return this.handleFallback(error);
        }

        return {
            recovered: false,
            message: 'No recovery strategy available',
        };
    }

    /**
     * Handle logout recovery
     */
    private async handleLogout(_error: AppError): Promise<RecoveryResult> {
        try {
            Logger.info('ErrorRecovery', 'Executing logout recovery');

            if (this.onLogout) {
                await this.onLogout();
            }

            return {
                recovered: true,
                action: 'logout',
                message: 'User logged out due to authentication error',
            };
        } catch (err) {
            Logger.error('ErrorRecovery', 'Logout recovery failed', err);
            return {
                recovered: false,
                message: 'Logout recovery failed',
            };
        }
    }

    /**
     * Handle retry recovery
     */
    private async handleRetry(error: AppError): Promise<RecoveryResult> {
        try {
            Logger.info('ErrorRecovery', 'Executing retry recovery', {
                retryCount: error.recoveryStrategy.retryCount,
                retryDelay: error.recoveryStrategy.retryDelay,
            });

            if (this.onRetry) {
                await this.onRetry(error);
            }

            return {
                recovered: true,
                action: 'retry',
                message: 'Request will be retried',
            };
        } catch (err) {
            Logger.error('ErrorRecovery', 'Retry recovery failed', err);
            return {
                recovered: false,
                message: 'Retry recovery failed',
            };
        }
    }

    /**
     * Handle fallback action
     */
    private async handleFallback(error: AppError): Promise<RecoveryResult> {
        try {
            Logger.info('ErrorRecovery', 'Executing fallback action');

            if (error.recoveryStrategy.fallbackAction) {
                error.recoveryStrategy.fallbackAction();
            }

            return {
                recovered: true,
                action: 'fallback',
                message: 'Fallback action executed',
            };
        } catch (err) {
            Logger.error('ErrorRecovery', 'Fallback action failed', err);
            return {
                recovered: false,
                message: 'Fallback action failed',
            };
        }
    }

    /**
     * Get retry delay with exponential backoff
     */
    static getRetryDelay(retryCount: number, baseDelay: number = 1000): number {
        // Exponential backoff: baseDelay * 2^retryCount
        return baseDelay * Math.pow(2, retryCount);
    }

    /**
     * Should retry based on error code
     */
    static shouldRetry(errorCode: ErrorCode): boolean {
        const retryableErrors = [
            ErrorCode.NETWORK_ERROR,
            ErrorCode.TIMEOUT_ERROR,
            ErrorCode.CONNECTION_REFUSED,
            ErrorCode.RATE_LIMITED,
            ErrorCode.SERVER_ERROR,
            ErrorCode.SERVICE_UNAVAILABLE,
        ];

        return retryableErrors.includes(errorCode);
    }

    /**
     * Should logout based on error code
     */
    static shouldLogout(errorCode: ErrorCode): boolean {
        const logoutErrors = [
            ErrorCode.UNAUTHORIZED,
            ErrorCode.TOKEN_EXPIRED,
            ErrorCode.TOKEN_INVALID,
            ErrorCode.UNAUTHORIZED_ACCESS,
        ];

        return logoutErrors.includes(errorCode);
    }
}

/**
 * Export singleton instance
 */
export const errorRecoveryManager = ErrorRecoveryManager.getInstance();
