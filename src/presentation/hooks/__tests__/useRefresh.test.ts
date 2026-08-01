import { act, renderHook } from '@testing-library/react-native';

import useRefresh from '../useRefresh';

/**
 * The hook exists to drive `RefreshControl.refreshing`, and its one real caller passes
 * React Query's `refetch`, which returns a promise.
 *
 * The regression these tests pin: the callback was typed `() => void` and invoked
 * without `await`, so `setIsRefreshing(false)` ran in the same tick as `true`. A
 * promise-returning `refetch` still typechecked, and the spinner was structurally
 * unable to stay up for the request it was reporting on.
 */
describe('useRefresh', () => {
    it('stays refreshing until a promise-returning callback settles', async () => {
        let resolveRefresh: (() => void) | undefined;
        const refresh = jest.fn(
            () =>
                new Promise<void>((resolve) => {
                    resolveRefresh = resolve;
                })
        );

        const { result } = renderHook(() => useRefresh(refresh));

        expect(result.current[0]).toBe(false);

        // Not awaited here: the assertion is about the window *while* the refresh is in
        // flight, which awaiting would skip past.
        let pending: Promise<void>;
        act(() => {
            pending = result.current[1]();
        });

        expect(refresh).toHaveBeenCalledTimes(1);
        expect(result.current[0]).toBe(true);

        await act(async () => {
            resolveRefresh?.();
            await pending;
        });

        expect(result.current[0]).toBe(false);
    });

    it('clears the flag when a synchronous callback returns', async () => {
        const refresh = jest.fn();

        const { result } = renderHook(() => useRefresh(refresh));

        await act(async () => {
            await result.current[1]();
        });

        expect(refresh).toHaveBeenCalledTimes(1);
        expect(result.current[0]).toBe(false);
    });

    it('clears the flag when the callback rejects', async () => {
        const refresh = jest.fn(() => Promise.reject(new Error('network down')));

        const { result } = renderHook(() => useRefresh(refresh));

        await act(async () => {
            await expect(result.current[1]()).rejects.toThrow('network down');
        });

        // A failed refresh must not strand the control in its spinning state.
        expect(result.current[0]).toBe(false);
    });

    it('never enters the refreshing state without a callback', async () => {
        const { result } = renderHook(() => useRefresh(undefined));

        await act(async () => {
            await result.current[1]();
        });

        expect(result.current[0]).toBe(false);
    });
});
