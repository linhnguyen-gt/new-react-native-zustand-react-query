import { createStore } from './storeFactory';

type ResponseState = ResponseStateData & {
    setResponse: (response?: ResponseData[]) => void;
    setResponseDetail: (detail?: ResponseData) => void;
    clearResponse: () => void;
    clearResponseDetail: () => void;
};

const initialState: ResponseStateData = {
    response: [],
    responseDetail: null,
};

export const useResponseStore = createStore<ResponseState>('Response', (set) => ({
    ...initialState,
    setResponse: (response) => set({ response }),
    setResponseDetail: (detail) => set({ responseDetail: detail }),
    clearResponse: () => set({ response: [] }),
    clearResponseDetail: () => set({ responseDetail: null }),
}));
