import * as z from "zod";

/**
 * Schema for response data validation
 */
export const ResponseSchema = z.object({
    "ID State": z.string(),
    "ID Year": z.number(),
    Population: z.number(),
    "Slug State": z.string(),
    State: z.string(),
    Year: z.string()
});

/**
 * Type definition for response data
 */
export type ResponseData = z.infer<typeof ResponseSchema>;
