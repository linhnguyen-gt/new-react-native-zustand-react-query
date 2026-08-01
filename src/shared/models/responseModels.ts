import * as z from 'zod';

export const ResponseSchema = z.object({
    userId: z.number(),
    id: z.number(),
    title: z.string(),
    body: z.string(),
});

export const ResponseListSchema = z.array(ResponseSchema);

/**
 * Exported, not declared global.
 *
 * This was `declare global { type ResponseData = ... }`, which made the type reachable
 * from every file in the program with no import — and therefore invisible to the import
 * graph. Rename, find-references and unused-type detection all stopped at the boundary
 * of that global, and no module could own a type name without owning it for the entire
 * application.
 */
export type ResponseData = z.infer<typeof ResponseSchema>;
