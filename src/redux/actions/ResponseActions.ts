import { createAction } from "@reduxjs/toolkit";

import { ActionTypes } from "@/constants";

export const getResponse = createAction(ActionTypes.GET_RESPONSE);

export const setResponse = createAction<ResponseData[]>(ActionTypes.SET_RESPONSE);
