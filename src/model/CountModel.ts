import * as z from "zod";

export const CountSchema = z.number().optional();

declare global {
    type Count = z.infer<typeof CountSchema>;
    export type CountReducers = {
        count: Count;
    };
}
