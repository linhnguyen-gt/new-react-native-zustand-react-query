import { renderHook, act } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { useAppState } from '../useAppState';

// Mock react-native AppState
jest.mock('react-native', () => ({
    AppState: {
        currentState: 'active',
        addEventListener: jest.fn(),
    },
}));

describe('useAppState', () => {
    let mockAddEventListener: jest.Mock;
    let mockRemove: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        mockRemove = jest.fn();
        mockAddEventListener = jest.fn().mockReturnValue({ remove: mockRemove });
        (AppState.addEventListener as jest.Mock) = mockAddEventListener;
    });

    it('should return initial app state', () => {
        const { result } = renderHook(() => useAppState());
        expect(result.current).toBe('active');
    });

    it('should subscribe to AppState changes on mount', () => {
        renderHook(() => useAppState());
        expect(mockAddEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('should update state when AppState changes', () => {
        let stateChangeHandler: ((state: string) => void) | undefined;
        mockAddEventListener.mockImplementation((event, handler) => {
            stateChangeHandler = handler;
            return { remove: mockRemove };
        });

        const { result } = renderHook(() => useAppState());

        act(() => {
            if (stateChangeHandler) {
                stateChangeHandler('background');
            }
        });

        expect(result.current).toBe('background');
    });

    it('should handle multiple state changes', () => {
        let stateChangeHandler: ((state: string) => void) | undefined;
        mockAddEventListener.mockImplementation((event, handler) => {
            stateChangeHandler = handler;
            return { remove: mockRemove };
        });

        const { result } = renderHook(() => useAppState());

        act(() => {
            if (stateChangeHandler) {
                stateChangeHandler('inactive');
            }
        });
        expect(result.current).toBe('inactive');

        act(() => {
            if (stateChangeHandler) {
                stateChangeHandler('active');
            }
        });
        expect(result.current).toBe('active');

        act(() => {
            if (stateChangeHandler) {
                stateChangeHandler('background');
            }
        });
        expect(result.current).toBe('background');
    });

    it('should unsubscribe from AppState on unmount', () => {
        const { unmount } = renderHook(() => useAppState());
        expect(mockRemove).not.toHaveBeenCalled();

        unmount();
        expect(mockRemove).toHaveBeenCalled();
    });

    it('should handle unknown app states', () => {
        let stateChangeHandler: ((state: string) => void) | undefined;
        mockAddEventListener.mockImplementation((event, handler) => {
            stateChangeHandler = handler;
            return { remove: mockRemove };
        });

        const { result } = renderHook(() => useAppState());

        act(() => {
            if (stateChangeHandler) {
                stateChangeHandler('unknown' as any);
            }
        });

        expect(result.current).toBe('unknown');
    });

    it('should not subscribe multiple times on re-renders', () => {
        const { rerender } = renderHook(() => useAppState());
        expect(mockAddEventListener).toHaveBeenCalledTimes(1);

        rerender(undefined);
        expect(mockAddEventListener).toHaveBeenCalledTimes(1);
    });
});
