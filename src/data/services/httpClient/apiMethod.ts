/**
 * HTTP methods, as a const object rather than an `enum`.
 *
 * `enum` emits a runtime object no type-stripping transpiler can erase, which is what
 * `erasableSyntaxOnly` rejects — and Metro, esbuild and SWC all strip types
 * file-by-file. `docs/code-standards.md` has said "prefer `as const` unions over `enum`"
 * since before this file existed; this brings the file in line with it.
 *
 * Call sites are unchanged: `ApiMethod.GET` still reads `'GET'`, `Object.values(ApiMethod)`
 * still enumerates the five methods, and the merged type declaration keeps
 * `method: ApiMethod` working as an annotation.
 */
const ApiMethod = {
    GET: 'GET',
    POST: 'POST',
    PUT: 'PUT',
    PATCH: 'PATCH',
    DELETE: 'DELETE',
} as const;

type ApiMethod = (typeof ApiMethod)[keyof typeof ApiMethod];

export default ApiMethod;
