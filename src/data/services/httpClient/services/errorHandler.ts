import { AxiosError } from 'axios';

import { errorHandler } from '@/core/error';

/**
 * Classifies a thrown value and rethrows it as a typed `AppError`.
 *
 * This was a class — `ErrorHandler` — whose own docblock said "Deprecated: Use
 * errorHandler from @/core/error instead" while remaining the only path `HttpClient`
 * actually called. It held no state, had one method, and was injected through a
 * constructor parameter that the module-scope `getInstance()` made unreachable. What
 * remained was a second thing named `ErrorHandler`, one import away from the real one,
 * with a deprecation notice pointing at a migration nobody could complete.
 *
 * The behaviour is unchanged: attach the request's endpoint and method as context, then
 * hand off to the unified handler. Only the packaging is gone.
 *
 * @returns never — the return type is `Promise<never>` so `return await rethrowAsAppError(e)`
 * inside a catch typechecks as the function's own return type rather than widening it.
 */
export const rethrowAsAppError = async (error: unknown): Promise<never> => {
    // `unknown`, not AxiosError: the catch that calls this receives whatever was thrown,
    // including validation errors raised before the request is dispatched.
    const axiosError = error instanceof AxiosError ? error : undefined;

    throw errorHandler.handle(error, {
        endpoint: axiosError?.config?.url,
        method: axiosError?.config?.method?.toUpperCase(),
    });
};
