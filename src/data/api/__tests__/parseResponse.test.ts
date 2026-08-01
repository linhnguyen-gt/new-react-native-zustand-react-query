import * as z from 'zod';

import { SchemaValidationError } from '@/shared/errors';
import { ResponseListSchema, ResponseSchema } from '@/shared/models';

import { parseOrThrow } from '../parseResponse';

/**
 * `ResponseSchema` shipped in this repo from the start and was never executed — it only
 * fed `z.infer` to produce a type. Every one of these cases previously typechecked as
 * `ResponseData` and failed somewhere downstream inside a render, far from the request
 * that produced it.
 */
describe('parseOrThrow', () => {
    const post = { userId: 1, id: 1, title: 'A post', body: 'Body text' };

    it('returns the parsed value when the payload matches', () => {
        expect(parseOrThrow(ResponseSchema, post, 'posts/1')).toEqual(post);
    });

    it('rejects a payload whose field types are wrong', () => {
        // The exact failure a backend introduces by serialising an id as a string.
        expect(() => parseOrThrow(ResponseSchema, { ...post, id: '1' }, 'posts/1')).toThrow(SchemaValidationError);
    });

    it('rejects a missing body rather than forwarding undefined', () => {
        // `HttpResponse.data` is optional, so this is what a 204 or an empty body reaches
        // the API layer as. The old code assigned it straight into a `ResponseData[]`.
        expect(() => parseOrThrow(ResponseListSchema, undefined, 'posts')).toThrow(SchemaValidationError);
    });

    it('rejects an HTML error page that survived the transport', () => {
        expect(() => parseOrThrow(ResponseListSchema, '<html>502 Bad Gateway</html>', 'posts')).toThrow(
            SchemaValidationError
        );
    });

    it('names the endpoint and carries the zod issues', () => {
        // Captured rather than asserted inside a catch: `jest/no-conditional-expect` is
        // right that an expectation reachable only on one branch passes silently when the
        // branch is never taken. Pulling the error out first makes the assertions
        // unconditional, and the `toBeInstanceOf` proves the throw happened at all.
        const thrown = (() => {
            try {
                parseOrThrow(ResponseSchema, { userId: 1 }, 'posts/7');
                return null;
            } catch (error) {
                return error as SchemaValidationError;
            }
        })();

        expect(thrown).toBeInstanceOf(SchemaValidationError);
        expect(thrown?.message).toContain('posts/7');
        // Issues are what make the failure diagnosable — an error naming only the endpoint
        // says a request broke without saying which field did.
        expect(thrown?.errors.length).toBeGreaterThan(0);
        expect(thrown?.context.endpoint).toBe('posts/7');
    });

    it('is not tied to the response schemas', () => {
        // The helper is generic over any zod schema; nothing about it is posts-specific.
        expect(parseOrThrow(z.object({ token: z.string() }), { token: 'abc' }, 'auth/login')).toEqual({
            token: 'abc',
        });
    });
});
