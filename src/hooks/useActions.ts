import { ActionCreatorWithPayload, PayloadAction } from "@reduxjs/toolkit";
import React from "react";
import { useDispatch } from "react-redux";
import { Dispatch } from "redux";

type BoundActionCreator<TPayload> = {
    (payload: TPayload): PayloadAction<TPayload>;
    (): PayloadAction<undefined>;
};

type ActionCreatorMap<TActionMap> = {
    [K in keyof TActionMap]: TActionMap[K] extends ActionCreatorWithPayload<infer TPayload, any>
        ? BoundActionCreator<TPayload>
        : never;
};

/**
 * Custom hook to bind action creators with dispatch
 * @param actions Single action creator or object containing multiple action creators
 * @returns Bound action creator(s)
 */
function useActions<TPayload>(actionCreator: ActionCreatorWithPayload<TPayload, string>): BoundActionCreator<TPayload>;
function useActions<TActionMap extends Record<string, ActionCreatorWithPayload<any, string>>>(
    actionCreators: TActionMap
): ActionCreatorMap<TActionMap>;
function useActions<TPayload, TActionMap extends Record<string, ActionCreatorWithPayload<any, string>>>(
    actionCreator: ActionCreatorWithPayload<TPayload, string> | TActionMap
): BoundActionCreator<TPayload> | ActionCreatorMap<TActionMap> {
    const dispatch = useDispatch<Dispatch>();

    return React.useMemo(() => {
        if (typeof actionCreator === "function") {
            const boundActionCreator = function (this: void, payload?: TPayload) {
                return dispatch(actionCreator(payload as TPayload));
            } as BoundActionCreator<TPayload>;
            return boundActionCreator;
        }

        type ActionMap = {
            [K in keyof TActionMap]: TActionMap[K] extends ActionCreatorWithPayload<infer ActionPayload, any>
                ? BoundActionCreator<ActionPayload>
                : never;
        };

        const boundActionCreators = {} as ActionMap;

        for (const key in actionCreator) {
            const action = actionCreator[key];
            boundActionCreators[key] = function (this: void, payload?: TPayload) {
                return dispatch(action(payload));
            } as TActionMap[typeof key] extends ActionCreatorWithPayload<infer ActionPayload, any>
                ? BoundActionCreator<ActionPayload>
                : never;
        }

        return boundActionCreators;
    }, [actionCreator, dispatch]);
}

export default useActions;
