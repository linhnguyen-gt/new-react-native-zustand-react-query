import { createSelector } from "@reduxjs/toolkit";

const CountSelectors = (state: AppState) => state.count;

export const count = createSelector(CountSelectors, (state) => state.count);
