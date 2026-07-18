import Logger from '../logger';

/**
 * sanitizeData walks every own enumerable property recursively. Axios errors
 * reference their own request and response, so an unguarded walk overflows the
 * stack — and since Logger runs inside catch blocks, that converts a recoverable
 * network failure into a crash.
 */
describe('Logger.sanitizeData', () => {
    // jest.setup.js replaces global.console with persistent jest.fn()s. Use those
    // directly — spyOn plus restoreAllMocks fights that setup and loses the calls.
    const consoleError = console.error as jest.Mock;
    const consoleWarn = console.warn as jest.Mock;

    beforeEach(() => {
        consoleError.mockClear();
        consoleWarn.mockClear();
    });

    it('does not overflow the stack on a circular object', () => {
        const request: Record<string, unknown> = { url: '/posts' };
        const response: Record<string, unknown> = { status: 500 };
        // The axios shape: request and response point at each other.
        request.response = response;
        response.request = request;

        expect(() => Logger.error('Test', 'request failed', request)).not.toThrow();
        expect(consoleError).toHaveBeenCalled();
    });

    it('marks a repeated reference as circular rather than recursing', () => {
        const node: Record<string, unknown> = { name: 'root' };
        node.self = node;

        Logger.error('Test', node);

        const logged = consoleError.mock.calls[0][1];
        expect(logged.self).toBe('[CIRCULAR]');
    });

    it('keeps arrays as arrays', () => {
        Logger.error('Test', { items: ['a', 'b', 'c'] });

        const logged = consoleError.mock.calls[0][1];
        expect(Array.isArray(logged.items)).toBe(true);
        expect(logged.items).toEqual(['a', 'b', 'c']);
    });

    it('preserves Error message and stack, which are non-enumerable', () => {
        const error = new Error('Network unreachable');

        Logger.error('Test', error);

        const logged = consoleError.mock.calls[0][1];
        expect(logged.message).toBe('Network unreachable');
        expect(logged.name).toBe('Error');
        expect(logged.stack).toContain('Network unreachable');
    });

    it('still redacts sensitive keys', () => {
        Logger.warn('Test', { password: 'hunter2', accessToken: 'abc', safe: 'visible' });

        const logged = consoleWarn.mock.calls[0][1];
        expect(logged.password).toBe('[REDACTED]');
        expect(logged.accessToken).toBe('[REDACTED]');
        expect(logged.safe).toBe('visible');
    });

    it('expands a shared reference held by siblings instead of calling it circular', () => {
        // A normalised list: every row points at the same org object. That is a DAG,
        // not a cycle, and each row must still log its full contents.
        const org = { id: 7, name: 'acme' };
        const rows = [{ org }, { org }];

        Logger.error('Test', { rows });

        const logged = consoleError.mock.calls[0][1];
        expect(logged.rows[0].org).toEqual({ id: 7, name: 'acme' });
        expect(logged.rows[1].org).toEqual({ id: 7, name: 'acme' });
        expect(JSON.stringify(logged)).not.toContain('[CIRCULAR]');
    });

    it('redacts secrets in the stack, not just the message', () => {
        const error = new Error('auth failed with Bearer abc123DEFxyz');

        Logger.error('Test', error);

        const logged = consoleError.mock.calls[0][1];
        expect(logged.message).toContain('[REDACTED]');
        // V8 stacks open with "Error: <message>", so an unredacted stack re-emits
        // whatever the message redaction just removed.
        expect(logged.stack).not.toContain('abc123DEFxyz');
    });

    it('keeps enumerable own properties on an error', () => {
        const error = Object.assign(new Error('Request failed'), {
            code: 'ERR_BAD_RESPONSE',
            status: 503,
        });

        Logger.error('Test', error);

        const logged = consoleError.mock.calls[0][1];
        expect(logged.code).toBe('ERR_BAD_RESPONSE');
        expect(logged.status).toBe(503);
        expect(logged.message).toBe('Request failed');
    });

    it('caps depth on a deeply nested object', () => {
        let deep: Record<string, unknown> = { value: 'bottom' };
        for (let i = 0; i < 20; i += 1) {
            deep = { nested: deep };
        }

        expect(() => Logger.error('Test', deep)).not.toThrow();
    });
});
