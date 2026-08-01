import type * as z from 'zod';

import { SchemaValidationError } from '@/shared/errors';

/**
 * Validates a response body against its schema at the API boundary.
 *
 * `ResponseSchema` has existed in `shared/models/responseModels.ts` since the start and
 * was never once executed — it only fed `z.infer` to produce a type. So the app asserted
 * the shape of every response at compile time and checked it at runtime nowhere: a
 * backend renaming a field, returning `null`, or an HTML error page that somehow reached
 * this far all typechecked as `ResponseData[]` and blew up later inside a render, far
 * from the request that caused it.
 *
 * `SchemaValidationError` was in the same position — defined in `shared/errors`, wired
 * into the error handler's recovery strategy, and only ever constructible through a
 * string heuristic (`message.includes('schema')`). This is the path that raises it for
 * real, so the categoriser no longer has to guess.
 *
 * @param schema the zod schema the payload must satisfy
 * @param payload the raw response body, deliberately typed `unknown`
 * @param endpoint used only for the error message, so a failure names its source
 * @throws SchemaValidationError when the payload does not match
 */
export const parseOrThrow = <TSchema extends z.ZodType>(
    schema: TSchema,
    payload: unknown,
    endpoint: string
): z.infer<TSchema> => {
    const result = schema.safeParse(payload);

    if (!result.success) {
        throw new SchemaValidationError(`Response from "${endpoint}" did not match its schema.`, result.error.issues, {
            endpoint,
        });
    }

    return result.data;
};
