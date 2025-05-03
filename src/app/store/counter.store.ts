import { createStore } from "./store.factory";

interface CounterState extends CounterStateData {
    increment: () => void;
    decrement: () => void;
    reset: () => void;
}

const initialState: CounterStateData = {
    count: 0
};

export const useCounterStore = createStore<CounterState>(
    "Counter",
    (set) => ({
        ...initialState,
        increment: () => set((state) => ({ count: state.count + 1 })),
        decrement: () => set((state) => ({ count: state.count - 1 })),
        reset: () => set({ count: 0 })
    }),
    { initialState }
);
