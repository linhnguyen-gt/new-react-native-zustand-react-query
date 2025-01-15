import * as z from "zod";

export const ResponseSchema = z.object({
    "ID State": z.string(),
    "ID Year": z.number(),
    Population: z.number(),
    "Slug State": z.string(),
    State: z.string(),
    Year: z.string()
});

declare global {
    type ResponseData = z.infer<typeof ResponseSchema>;
    type ResponseReducers = {
        response: ResponseData[];
    };
}
