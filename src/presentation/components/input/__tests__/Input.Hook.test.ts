import { renderHook } from '@testing-library/react-native';
import { Animated } from 'react-native';

import useShakeView from '../Input.Hook';

const mockAnimatedValue = {
    setValue: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    removeAllListeners: jest.fn(),
    hasListeners: jest.fn(),
    stopAnimation: jest.fn(),
    setOffset: jest.fn(),
    flattenOffset: jest.fn(),
    extractOffset: jest.fn(),
    resetAnimation: jest.fn(),
    interpolate: jest.fn(),
};

const mockTiming = jest.fn().mockReturnValue({
    start: jest.fn(),
});

const mockSequence = jest.fn().mockReturnValue({
    start: jest.fn(),
});

const mockLoop = jest.fn().mockReturnValue({
    start: jest.fn(),
});

jest.mock('react-native', () => ({
    Animated: {
        Value: jest.fn(() => mockAnimatedValue),
        timing: mockTiming,
        sequence: mockSequence,
        loop: mockLoop,
    },
    Appearance: {
        getColorScheme: jest.fn(() => 'light'),
    },
}));

jest.mock('react-native-css-interop', () => ({
    createInteropElement: jest.fn((component) => component),
}));

describe('useShakeView', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns transform object with translateX animation', () => {
        const { result } = renderHook(() => useShakeView());

        expect(result.current).toEqual({
            transform: [{ translateX: expect.any(Object) }],
        });
    });

    it('creates animated value on mount', () => {
        renderHook(() => useShakeView());

        expect(Animated.Value).toHaveBeenCalledWith(0);
    });

    it('does not trigger shake animation when error is undefined', () => {
        renderHook(() => useShakeView(undefined));

        expect(mockTiming).not.toHaveBeenCalled();
        expect(mockSequence).not.toHaveBeenCalled();
        expect(mockLoop).not.toHaveBeenCalled();
    });

    it('does not trigger shake animation when error is false', () => {
        renderHook(() => useShakeView(false));

        expect(mockTiming).not.toHaveBeenCalled();
        expect(mockSequence).not.toHaveBeenCalled();
        expect(mockLoop).not.toHaveBeenCalled();
    });

    it('handles empty string error as falsy', () => {
        renderHook(() => useShakeView(''));

        expect(mockTiming).not.toHaveBeenCalled();
        expect(mockSequence).not.toHaveBeenCalled();
        expect(mockLoop).not.toHaveBeenCalled();
    });

    it('handles zero as falsy value', () => {
        renderHook(() => useShakeView(0 as any));

        expect(mockTiming).not.toHaveBeenCalled();
        expect(mockSequence).not.toHaveBeenCalled();
        expect(mockLoop).not.toHaveBeenCalled();
    });

    it('handles null as falsy value', () => {
        renderHook(() => useShakeView(null as any));

        expect(mockTiming).not.toHaveBeenCalled();
        expect(mockSequence).not.toHaveBeenCalled();
        expect(mockLoop).not.toHaveBeenCalled();
    });

    it('handles NaN as falsy value', () => {
        renderHook(() => useShakeView(NaN as any));

        expect(mockTiming).not.toHaveBeenCalled();
        expect(mockSequence).not.toHaveBeenCalled();
        expect(mockLoop).not.toHaveBeenCalled();
    });

    it('creates new animated value instance on each hook call', () => {
        renderHook(() => useShakeView());
        renderHook(() => useShakeView());

        expect(Animated.Value).toHaveBeenCalledTimes(2);
    });

    it('returns the same transform object structure for all error states', () => {
        const errorStates = [undefined, false, '', 0, null, NaN];

        errorStates.forEach((error) => {
            const { result } = renderHook(() => useShakeView(error as any));

            expect(result.current).toEqual({
                transform: [{ translateX: expect.any(Object) }],
            });
        });
    });

    it('maintains same animated value reference across re-renders with falsy errors', () => {
        const { result, rerender } = renderHook(({ error }: { error?: any }) => useShakeView(error), {
            initialProps: { error: undefined },
        });

        const firstAnimatedValue = result.current.transform[0].translateX;

        rerender({ error: false });

        const secondAnimatedValue = result.current.transform[0].translateX;

        expect(firstAnimatedValue).toBe(secondAnimatedValue);
    });

    it('returns consistent transform structure for different falsy values', () => {
        const falsyValues = [undefined, false, '', 0, null, NaN];

        falsyValues.forEach((value) => {
            const { result } = renderHook(() => useShakeView(value as any));

            expect(result.current).toHaveProperty('transform');
            expect(Array.isArray(result.current.transform)).toBe(true);
            expect(result.current.transform).toHaveLength(1);
            expect(result.current.transform[0]).toHaveProperty('translateX');
        });
    });
});
