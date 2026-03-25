import { renderHook } from '@testing-library/react-native';
import { usePrevious } from '../usePrevious';

describe('usePrevious', () => {
    it('should return undefined on first render', () => {
        const { result } = renderHook(() => usePrevious('initial'));
        expect(result.current).toBeUndefined();
    });

    it('should return previous value after update', () => {
        let currentValue = 'first';
        const { result, rerender } = renderHook(() => usePrevious(currentValue));

        expect(result.current).toBeUndefined();

        currentValue = 'second';
        rerender(undefined);
        expect(result.current).toBe('first');

        currentValue = 'third';
        rerender(undefined);
        expect(result.current).toBe('second');
    });

    it('should work with numbers', () => {
        let currentValue = 1;
        const { result, rerender } = renderHook(() => usePrevious(currentValue));

        expect(result.current).toBeUndefined();

        currentValue = 2;
        rerender(undefined);
        expect(result.current).toBe(1);

        currentValue = 3;
        rerender(undefined);
        expect(result.current).toBe(2);
    });

    it('should work with objects', () => {
        const obj1 = { id: 1 };
        const obj2 = { id: 2 };
        const obj3 = { id: 3 };

        let currentValue = obj1;
        const { result, rerender } = renderHook(() => usePrevious(currentValue));

        expect(result.current).toBeUndefined();

        currentValue = obj2;
        rerender(undefined);
        expect(result.current).toBe(obj1);

        currentValue = obj3;
        rerender(undefined);
        expect(result.current).toBe(obj2);
    });

    it('should work with arrays', () => {
        const arr1 = [1, 2];
        const arr2 = [3, 4];

        let currentValue: number[] = arr1;
        const { result, rerender } = renderHook(() => usePrevious(currentValue));

        expect(result.current).toBeUndefined();

        currentValue = arr2;
        rerender(undefined);
        expect(result.current).toBe(arr1);
    });

    it('should work with null values', () => {
        let currentValue: string | null = null;
        const { result, rerender } = renderHook(() => usePrevious(currentValue));

        expect(result.current).toBeUndefined();

        currentValue = 'value';
        rerender(undefined);
        expect(result.current).toBeNull();

        currentValue = null;
        rerender(undefined);
        expect(result.current).toBe('value');
    });

    it('should work with undefined values explicitly', () => {
        let currentValue: string | undefined = undefined;
        const { result, rerender } = renderHook(() => usePrevious(currentValue));

        expect(result.current).toBeUndefined();

        currentValue = 'value';
        rerender(undefined);
        expect(result.current).toBeUndefined();
    });

    it('should store value from previous render', () => {
        const value = { id: 1 };
        let currentValue = value;

        const { result, rerender } = renderHook(() => usePrevious(currentValue));

        // First render returns undefined (no previous value yet)
        expect(result.current).toBeUndefined();

        // Second render returns the value from first render
        rerender(undefined);
        expect(result.current).toBe(value);

        // Third render with same reference still returns value from second render
        rerender(undefined);
        expect(result.current).toBe(value);
    });

    it('should handle boolean values', () => {
        let currentValue = true;
        const { result, rerender } = renderHook(() => usePrevious(currentValue));

        expect(result.current).toBeUndefined();

        currentValue = false;
        rerender(undefined);
        expect(result.current).toBe(true);

        currentValue = true;
        rerender(undefined);
        expect(result.current).toBe(false);
    });
});
