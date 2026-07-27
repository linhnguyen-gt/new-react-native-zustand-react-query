import { AuthError, ErrorCode, TokenExpiredError } from '@/shared/errors';

import { UnifiedErrorHandler } from '../ErrorHandler';

describe('native error classification', () => {
    const handler = UnifiedErrorHandler.getInstance();

    it('classifies "auth token expired" as expired, not as a generic auth failure', () => {
        // The message contains both 'auth' and 'token expired'. With the generic
        // 'auth' test first it became an AuthError, which leaves shouldLogout unset.
        const result = handler.handle(new Error('auth token expired'));

        expect(result).toBeInstanceOf(TokenExpiredError);
        expect(result.code).toBe(ErrorCode.TOKEN_EXPIRED);
        expect(result.recoveryStrategy.shouldLogout).toBe(true);
    });

    it('still classifies a plain auth failure as AuthError', () => {
        const result = handler.handle(new Error('auth rejected'));

        expect(result).toBeInstanceOf(AuthError);
        expect(result.code).toBe(ErrorCode.AUTH_ERROR);
    });

    it('keeps the original throw site reachable on a typed branch', () => {
        const original = new Error('storage write failed');

        const result = handler.handle(original);

        // Typed branches used to construct a fresh error, so the stack pointed into
        // ErrorHandler rather than at the real throw site.
        expect(result.context.originalError).toBe(original);
    });

    it('merges caller context into an already-typed AppError', () => {
        const alreadyTyped = new TokenExpiredError('session over');

        const result = handler.handle(alreadyTyped, { endpoint: '/refresh-token', method: 'GET' });

        // httpClient passes endpoint/method; these were previously discarded whenever
        // the interceptor had already produced an AppError.
        expect(result.context.endpoint).toBe('/refresh-token');
        expect(result.context.method).toBe('GET');
    });
});
