import { all, fork } from "redux-saga/effects";

import { saga } from "@/redux";

class RootSaga {
    static *saga() {
        yield all([fork(saga.watchCount), fork(saga.watchResponse)]);
    }
}

export default RootSaga;
