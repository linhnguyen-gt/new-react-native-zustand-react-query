import { useSelector } from "react-redux";
import { ActionPattern } from "redux-saga/effects";

import { selectors } from "@/redux";

const useLoading = (action: ActionPattern[]) => useSelector(selectors.LoadingSelectors.isLoading(action));

export default useLoading;
