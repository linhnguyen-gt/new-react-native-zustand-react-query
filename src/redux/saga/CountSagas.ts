import { delay, put, select, takeEvery } from "redux-saga/effects";

import { actions, selectors } from "@/redux";

import { handleApiCall } from "./ApiSagaHelper";

function* increment() {
    yield* handleApiCall(actions.CountActions.increment.type, function* () {
        yield delay(1000);
        const data: number = yield select(selectors.CountSelectors.count);
        const count = data + 1;
        yield put(actions.CountActions.setIncrement(count));
    });
}

function* decrement() {
    yield handleApiCall(actions.CountActions.decrement.type, function* () {
        yield delay(1000);
        const data: number = yield select(selectors.CountSelectors.count);
        const count = data - 1;
        yield put(actions.CountActions.setDecrement(count));
    });
}

export default function* watchCount() {
    yield takeEvery(actions.CountActions.increment, increment);
    yield takeEvery(actions.CountActions.decrement, decrement);
}
