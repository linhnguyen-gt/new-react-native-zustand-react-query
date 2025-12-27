import { AppError, ErrorCode, NetworkError, TokenExpiredError } from '@/shared/errors';
import { ErrorRecoveryManager } from '../ErrorRecovery';

describe('ErrorRecoveryManager', () => {
    let manager: ErrorRecoveryManager;

    beforeEach(() => {
        manager = ErrorRecoveryManager.getInstance();
    });

    describe('Singleton pattern', () => {
        it('should return same instance', () => {
            const manager1 = ErrorRecoveryManager.getInstance();
            const manager2 = ErrorRecoveryManager.getInstance();

            expect(manager1).toBe(manager2);
        });
    });

    describe('Recovery strategies', () => {
        it('should recover from network error with retry', async () => {
            const error = new NetworkError('Network failed');
            const result = await manager.recover(error);

            expect(result.recovered).toBe(true);
            expect(result.action).toBe('retry');
        });

        it('should recover from token expired with logout', async () => {
            const onLogout = jest.fn().mockResolvedValue(undefined);
            manager.setOnLogout(onLogout);

            const error = new TokenExpiredError('Token expired');
            const result = await manager.recover(error);

            expect(result.recovered).toBe(true);
            expect(result.action).toBe('logout');
            expect(onLogout).toHaveBeenCalled();
        });

        it('should handle recovery failure', async () => {
            const onLogout = jest.fn().mockRejectedValue(new Error('Logout failed'));
            manager.setOnLogout(onLogout);

            const error = new TokenExpiredError('Token expired');
            const result = await manager.recover(error);

            expect(result.recovered).toBe(false);
        });
    });

    describe('Callbacks', () => {
        it('should set and call onLogout callback', async () => {
            const onLogout = jest.fn().mockResolvedValue(undefined);
            manager.setOnLogout(onLogout);

            const error = new TokenExpiredError('Token expired');
            await manager.recover(error);

            expect(onLogout).toHaveBeenCalled();
        });

        it('should set and call onRetry callback', async () => {
            const onRetry = jest.fn().mockResolvedValue(undefined);
            manager.setOnRetry(onRetry);

            const error = new NetworkError('Network failed');
            await manager.recover(error);

            expect(onRetry).toHaveBeenCalled();
        });
    });

    describe('Static helper methods', () => {
        describe('shouldRetry', () => {
            it('should return true for retryable errors', () => {
                expect(ErrorRecoveryManager.shouldRetry(ErrorCode.NETWORK_ERROR)).toBe(true);
                expect(ErrorRecoveryManager.shouldRetry(ErrorCode.TIMEOUT_ERROR)).toBe(true);
                expect(ErrorRecoveryManager.shouldRetry(ErrorCode.RATE_LIMITED)).toBe(true);
                expect(ErrorRecoveryManager.shouldRetry(ErrorCode.SERVER_ERROR)).toBe(true);
            });

            it('should return false for non-retryable errors', () => {
                expect(ErrorRecoveryManager.shouldRetry(ErrorCode.VALIDATION_ERROR)).toBe(false);
                expect(ErrorRecoveryManager.shouldRetry(ErrorCode.UNAUTHORIZED)).toBe(false);
                expect(ErrorRecoveryManager.shouldRetry(ErrorCode.FORBIDDEN)).toBe(false);
            });
        });

        describe('shouldLogout', () => {
            it('should return true for logout errors', () => {
                expect(ErrorRecoveryManager.shouldLogout(ErrorCode.UNAUTHORIZED)).toBe(true);
                expect(ErrorRecoveryManager.shouldLogout(ErrorCode.TOKEN_EXPIRED)).toBe(true);
                expect(ErrorRecoveryManager.shouldLogout(ErrorCode.TOKEN_INVALID)).toBe(true);
            });

            it('should return false for non-logout errors', () => {
                expect(ErrorRecoveryManager.shouldLogout(ErrorCode.NETWORK_ERROR)).toBe(false);
                expect(ErrorRecoveryManager.shouldLogout(ErrorCode.VALIDATION_ERROR)).toBe(false);
                expect(ErrorRecoveryManager.shouldLogout(ErrorCode.SERVER_ERROR)).toBe(false);
            });
        });

        describe('getRetryDelay', () => {
            it('should calculate exponential backoff', () => {
                expect(ErrorRecoveryManager.getRetryDelay(0, 1000)).toBe(1000);
                expect(ErrorRecoveryManager.getRetryDelay(1, 1000)).toBe(2000);
                expect(ErrorRecoveryManager.getRetryDelay(2, 1000)).toBe(4000);
                expect(ErrorRecoveryManager.getRetryDelay(3, 1000)).toBe(8000);
            });

            it('should use custom base delay', () => {
                expect(ErrorRecoveryManager.getRetryDelay(0, 500)).toBe(500);
                expect(ErrorRecoveryManager.getRetryDelay(1, 500)).toBe(1000);
                expect(ErrorRecoveryManager.getRetryDelay(2, 500)).toBe(2000);
            });
        });
    });

    describe('Fallback action', () => {
        it('should execute fallback action', async () => {
            const fallbackAction = jest.fn();
            const error = new AppError('Test error');
            error.recoveryStrategy.fallbackAction = fallbackAction;

            const result = await manager.recover(error);

            expect(result.recovered).toBe(true);
            expect(result.action).toBe('fallback');
            expect(fallbackAction).toHaveBeenCalled();
        });

        it('should handle fallback action failure', async () => {
            const fallbackAction = jest.fn().mockImplementation(() => {
                throw new Error('Fallback failed');
            });
            const error = new AppError('Test error');
            error.recoveryStrategy.fallbackAction = fallbackAction;

            const result = await manager.recover(error);

            expect(result.recovered).toBe(false);
        });
    });

    describe('No recovery strategy', () => {
        it('should return not recovered when no strategy available', async () => {
            const error = new AppError('Test error');
            error.recoveryStrategy.shouldRetry = false;
            error.recoveryStrategy.shouldLogout = false;
            error.recoveryStrategy.fallbackAction = undefined;

            const result = await manager.recover(error);

            expect(result.recovered).toBe(false);
        });
    });
});
