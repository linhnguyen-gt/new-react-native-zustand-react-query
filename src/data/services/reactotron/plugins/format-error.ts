/**
 * Serialised form of an `Error` for the Reactotron wire.
 *
 * `Error`'s own `message` and `stack` are non-enumerable, so an Error handed
 * straight to a structured logger serialises to `{}`. Copying the fields explicitly
 * is what makes them survive.
 */
interface SerializedError {
    name: string;
    message: string;
    stack?: string;
}

/**
 * Normalises anything thrown into something worth sending to Reactotron.
 *
 * Shared by the api and query plugins, which each carried a byte-identical copy
 * differing only in whether the parameter was typed `any` or `unknown`.
 *
 * The parameter is `unknown` because that is the truth about a catch binding — JS
 * allows throwing any value, and both call sites pass values originating from a
 * throw or from React Query's error state.
 */
export const formatError = (error: unknown): string | SerializedError => {
    if (!error) return 'Unknown error';

    if (error instanceof Error) {
        return {
            name: error.name,
            message: error.message,
            stack: error.stack,
        };
    }

    // `String(error)` rather than returning the value untouched: a union including
    // `unknown` collapses back to `unknown`, erasing the two useful members above.
    // This also matches how `categorizeError` handles a non-Error throw, so both
    // paths render a thrown string or object the same way.
    return String(error);
};
