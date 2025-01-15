import { create } from "zustand";

type ResponseState = {
    response: ResponseData[];
    setResponse: (response: ResponseData[]) => void;
    clearResponse: () => void;
};

export const useResponseStore = create<ResponseState>()((set) => ({
    response: [],
    setResponse: (response) => set({ response }),
    clearResponse: () => set({ response: [] })
}));
