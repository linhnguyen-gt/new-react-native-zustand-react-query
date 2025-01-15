import { createSelector } from "@reduxjs/toolkit";
import { ActionPattern } from "redux-saga/effects";

const LoadingSelectors = (state: AppState) => state;

export const isLoading = (action: ActionPattern[]) =>
    createSelector(LoadingSelectors, (state) => action.some((type) => state.loading[type as string]) ?? false);
