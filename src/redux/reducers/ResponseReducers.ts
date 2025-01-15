import { createSlice } from "@reduxjs/toolkit";

import { actions } from "@/redux";

const initialState: ResponseReducers = {
    response: []
};

const ResponseReducers = createSlice({
    name: "count",
    initialState,
    reducers: {},
    extraReducers: (builder) =>
        builder
            .addCase(actions.ResponseActions.setResponse, (state, action) => {
                state.response = action.payload;
            })
            .addDefaultCase((state) => state)
});

export default ResponseReducers.reducer;
