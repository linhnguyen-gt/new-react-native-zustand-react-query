import * as z from 'zod';

export const ResponseSchema = z.object({
    userId: z.number(),
    id: z.number(),
    title: z.string(),
    body: z.string(),
});

declare global {
    type ResponseData = z.infer<typeof ResponseSchema>;

    export type ResponseStateData = {
        response: ResponseData[];
        responseDetail: ResponseData | null;
    };
}
