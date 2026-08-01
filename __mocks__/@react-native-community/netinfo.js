/**
 * NetInfo stub.
 *
 * The real module reaches for a native connectivity module that does not exist under
 * jest. Only `addEventListener` is implemented because that is the whole of the surface
 * `reactQueryNativeBridge` uses.
 *
 * The registered listeners are exposed so a test can drive connectivity transitions
 * directly, which is the only way to assert that `onlineManager` is actually wired.
 */
const listeners = new Set();

const addEventListener = jest.fn((listener) => {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
});

/** Test helper — pushes a state to every registered listener. */
const __emit = (state) => {
    listeners.forEach((listener) => listener(state));
};

/** Test helper — drops every listener between cases. */
const __reset = () => {
    listeners.clear();
    addEventListener.mockClear();
};

module.exports = {
    __esModule: true,
    default: { addEventListener },
    addEventListener,
    __emit,
    __reset,
    __listenerCount: () => listeners.size,
};
