import { createStore } from "./store.factory";

import { ResponseData } from "@/shared/models";

type ResponseState = {
    response: ResponseData[];
    setResponse: (response: ResponseData[]) => void;
    clearResponse: () => void;
};

export const useResponseStore = createStore<ResponseState>("Response", (set) => ({
    response: [],
    setResponse: (response) => set({ response }),
    clearResponse: () => set({ response: [] })
}));
