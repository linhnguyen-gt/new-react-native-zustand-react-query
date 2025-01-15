import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ActionPattern } from "redux-saga/effects";

type LoadingState = Record<string, boolean>;

const initialState: LoadingState = {};

const LoadingReducers = createSlice({
    name: "loading",
    initialState,
    reducers: {
        startLoading: (state, action: PayloadAction<ActionPattern>) => {
            // Resetting state to empty before setting new loading state
            Object.keys(state).forEach((key) => {
                delete state[key];
            });
            state[action.payload as string] = true;
        },
        stopLoading: (state, action: PayloadAction<ActionPattern>) => {
            // Resetting state to empty before setting new loading state
            Object.keys(state).forEach((key) => {
                delete state[key];
            });
            state[action.payload as string] = false;
        }
    }
});

export const { startLoading, stopLoading } = LoadingReducers.actions;

export default LoadingReducers.reducer;
