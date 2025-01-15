import { Effect, put } from "redux-saga/effects";

import { startLoading, stopLoading } from "../reducers";

type EffectType = Effect | Promise<any>;
type SagaGenerator = Generator<EffectType, any, any>;
type SagaFunction = (...args: unknown[]) => SagaGenerator;

type LoadingOptions = {
    isLoading?: boolean;
};

function isLoadingOptions(obj: any): obj is LoadingOptions {
    return typeof obj === "object" && !("type" in obj);
}

export function* handleApiCall(
    optionsOrActionType: LoadingOptions | string,
    actionTypeOrSaga: string | SagaFunction,
    apiSaga?: SagaFunction,
    ...args: unknown[]
): Generator {
    const options = isLoadingOptions(optionsOrActionType) ? optionsOrActionType : { isLoading: true };
    const actionType = isLoadingOptions(optionsOrActionType)
        ? (actionTypeOrSaga as string)
        : (optionsOrActionType as string);
    const saga = isLoadingOptions(optionsOrActionType) ? apiSaga! : (actionTypeOrSaga as SagaFunction);

    const isLoading = options.isLoading ?? true;

    try {
        if (isLoading) {
            yield put(startLoading(actionType));
        }
        yield* saga(...args);
    } catch (error) {
        console.error(error);
        throw error;
    } finally {
        if (isLoading) {
            yield put(stopLoading(actionType));
        }
    }
}
