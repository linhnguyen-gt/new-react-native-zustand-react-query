export declare global {
    declare type ThenArg<T> = T extends Promise<infer U> ? U : T;
}
