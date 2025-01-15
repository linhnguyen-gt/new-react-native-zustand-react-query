import { createSlice } from "@reduxjs/toolkit";

import { actions } from "@/redux";

const initialState: CountReducers = {
    count: 0
};

const CountReducers = createSlice({
    name: "count",
    initialState,
    reducers: {},
    extraReducers: (builder) =>
        builder
            .addCase(actions.CountActions.setIncrement, (state, action) => {
                state.count = action.payload;
            })
            .addCase(actions.CountActions.setDecrement, (state, action) => {
                state.count = action.payload;
            })
            .addDefaultCase((state) => state)
});

export default CountReducers.reducer;
