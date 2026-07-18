import { act, renderHook, waitFor } from '@testing-library/react-native';

const mockNavigation = { reset: jest.fn(), goBack: jest.fn() };

jest.mock('@react-navigation/native', () => ({
    ...jest.requireActual('@react-navigation/native'),
    useNavigation: () => mockNavigation,
}));

import { useSignUpForm } from '../useSignUpForm';

const validForm = {
    fullName: 'Ada Lovelace',
    email: 'ada@example.com',
    password: 'correct-horse',
    confirmPassword: 'correct-horse',
};

describe('useSignUpForm', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    /**
     * Drives the hook the way the screen does — `handleSubmit(onSubmit)()`, not
     * `onSubmit()` directly. That distinction matters: the reported first-tap bug was
     * blamed on react-hook-form's formState proxy, which only participates through
     * handleSubmit. Calling onSubmit directly would bypass the mechanism entirely.
     */
    const submitThroughForm = (result: { current: ReturnType<typeof useSignUpForm> }) =>
        result.current.handleSubmit(result.current.onSubmit)();

    it('submits on the first attempt with a valid payload', async () => {
        const { result } = renderHook(() => useSignUpForm());

        act(() => {
            result.current.control._reset(validForm);
        });

        await act(async () => {
            await submitThroughForm(result);
        });

        // The old guard read formState.isValid without subscribing to it during
        // render, so it stayed false and the first submit did nothing at all.
        await waitFor(() => {
            expect(mockNavigation.reset).toHaveBeenCalledTimes(1);
        });
    });

    it('ignores a re-entrant submit while one is already in flight', async () => {
        const { result } = renderHook(() => useSignUpForm());

        act(() => {
            result.current.control._reset(validForm);
        });

        await act(async () => {
            // Two taps inside the window before React commits the disabled prop.
            await Promise.all([submitThroughForm(result), submitThroughForm(result)]);
        });

        // The re-entrancy guard has to be a ref, not state: a state read from this
        // callback's closure is stale for a second call in the same tick, so both
        // submitted. Once the TODO becomes a real API call that is two accounts.
        await waitFor(() => {
            expect(mockNavigation.reset).toHaveBeenCalledTimes(1);
        });
    });

    it('does not submit when validation fails', async () => {
        const { result } = renderHook(() => useSignUpForm());

        act(() => {
            result.current.control._reset({ ...validForm, email: 'not-an-email' });
        });

        await act(async () => {
            await submitThroughForm(result);
        });

        // handleSubmit runs the resolver and refuses to invoke onSubmit — which is
        // why the removed formState.isValid clause was redundant.
        expect(mockNavigation.reset).not.toHaveBeenCalled();
    });
});
