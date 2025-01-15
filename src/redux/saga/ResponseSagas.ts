import { put, takeEvery } from "redux-saga/effects";

import { actions } from "@/redux";

import { ResponseApi } from "@/apis";
import { handleApiCall } from "@/redux/saga/ApiSagaHelper";

function* getResponse() {
    yield* handleApiCall(actions.ResponseActions.getResponse.type, function* () {
        const response: ThenArg<ReturnType<typeof ResponseApi.responseApi>> = yield ResponseApi.responseApi();
        if (response?.ok) {
            yield put(actions.ResponseActions.setResponse(response.data));
        }
    });
}

export default function* watchResponse() {
    yield takeEvery(actions.ResponseActions.getResponse, getResponse);
}
