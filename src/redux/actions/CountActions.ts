import { createAction } from "@reduxjs/toolkit";

import { ActionTypes } from "@/constants";

export const increment = createAction(ActionTypes.INCREMENT);

export const setIncrement = createAction<Count>(ActionTypes.SET_INCREMENT);

export const decrement = createAction(ActionTypes.DECREMENT);

export const setDecrement = createAction<Count>(ActionTypes.SET_DECREMENT);
