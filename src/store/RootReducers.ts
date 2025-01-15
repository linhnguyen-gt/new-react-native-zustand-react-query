import { combineReducers } from "redux";

import { CountReducers, LoadingReducers, ResponseReducers } from "@/redux/reducers";

const RootReducers = combineReducers({
    count: CountReducers,
    response: ResponseReducers,
    loading: LoadingReducers
});

export default RootReducers;

declare global {
    export type AppState = ReturnType<typeof RootReducers>;
}
