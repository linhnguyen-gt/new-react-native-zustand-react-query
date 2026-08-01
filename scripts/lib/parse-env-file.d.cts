/**
 * Types for the shared env parser.
 *
 * A sibling declaration file for the same reason `variant-config.d.cts` is one:
 * `app.config.ts` reaches this module through `require()`, which TypeScript types as
 * `any`. Without this, `app.config.ts` would read env values as `any` — exactly the
 * looseness that let `EXPO_UPDATE_CHANNEL` carry an inline comment into an EAS publish.
 */

/** Parse env-file text. Malformed lines are skipped. */
export declare function parseEnv(contents: string): Record<string, string>;

/** Parse an env file by path. A missing or unreadable file yields `{}`. */
export declare function parseEnvFile(filePath: string): Record<string, string>;
