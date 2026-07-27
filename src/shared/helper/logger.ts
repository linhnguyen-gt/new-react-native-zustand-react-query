interface LogData {
    [key: string]: any;
}

const SENSITIVE_KEYS = ['password', 'token', 'secret', 'key', 'authorization', 'auth'];

/**
 * Depth cap for {@link Logger.sanitizeData}. Axios errors nest deeply through
 * config/request/response; without a cap a single logged error walks a very large
 * object graph on every call.
 */
const MAX_SANITIZE_DEPTH = 8;

class Logger {
    /**
     * Redacts secrets from a value before it is logged.
     *
     * `seen` tracks objects already visited on the current path. Axios errors
     * reference their own request and response, so an unguarded walk recurses until
     * the stack overflows — and because this runs inside catch blocks, that turns a
     * recoverable network failure into a crash.
     */
    private static sanitizeData(data: any, depth = 0, seen: WeakSet<object> = new WeakSet()): any {
        if (typeof data === 'string') {
            return data
                .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/g, 'Bearer [REDACTED]')
                .replace(/password["\s]*[:=]["\s]*[^"\s,}]+/gi, 'password: [REDACTED]')
                .replace(/token["\s]*[:=]["\s]*[^"\s,}]+/gi, 'token: [REDACTED]')
                .replace(/key["\s]*[:=]["\s]*[^"\s,}]+/gi, 'key: [REDACTED]')
                .replace(/secret["\s]*[:=]["\s]*[^"\s,}]+/gi, 'secret: [REDACTED]');
        }

        if (typeof data !== 'object' || data === null) {
            return data;
        }

        if (depth >= MAX_SANITIZE_DEPTH) {
            return '[MAX_DEPTH]';
        }

        if (seen.has(data)) {
            return '[CIRCULAR]';
        }

        // `seen` tracks the CURRENT PATH, not everything visited. It is removed again
        // on the way out, so a value referenced by several siblings — a normalised
        // list where every row points at the same org object, say — is expanded each
        // time instead of being mislabelled '[CIRCULAR]' after the first.
        seen.add(data);
        try {
            // Arrays are typeof 'object'. Without this branch they were rebuilt as
            // objects with numeric keys, so logged lists lost their shape.
            if (Array.isArray(data)) {
                return data.map((item) => this.sanitizeData(item, depth + 1, seen));
            }

            // Error's message and stack are non-enumerable, so Object.entries misses
            // them and a logged error would otherwise sanitize to '{}'. The stack is
            // run through the string redaction too: V8 stacks start with
            // 'Error: <message>', which would otherwise re-emit whatever the message
            // redaction just removed.
            if (data instanceof Error) {
                const sanitizedError: LogData = {
                    name: data.name,
                    message: this.sanitizeData(data.message, depth + 1, seen),
                    stack: this.sanitizeData(data.stack, depth + 1, seen),
                };
                // Keep enumerable own properties as well: axios attaches code, config
                // and response there, and dropping them loses the request URL and
                // status that make an error diagnosable.
                for (const [key, value] of Object.entries(data)) {
                    if (key in sanitizedError) continue;
                    sanitizedError[key] = SENSITIVE_KEYS.some((sensitiveKey) =>
                        key.toLowerCase().includes(sensitiveKey)
                    )
                        ? '[REDACTED]'
                        : this.sanitizeData(value, depth + 1, seen);
                }
                return sanitizedError;
            }

            const sanitized: LogData = {};
            for (const [key, value] of Object.entries(data)) {
                if (SENSITIVE_KEYS.some((sensitiveKey) => key.toLowerCase().includes(sensitiveKey))) {
                    sanitized[key] = '[REDACTED]';
                } else {
                    sanitized[key] = this.sanitizeData(value, depth + 1, seen);
                }
            }
            return sanitized;
        } finally {
            seen.delete(data);
        }
    }

    // Sanitizing happens inside the __DEV__ guard in every method. Doing it outside
    // walked the whole object graph in release builds and then discarded the result.

    static error(tag: string, message: any, ...args: any[]) {
        if (__DEV__) {
            const sanitizedMessage = this.sanitizeData(message);
            const sanitizedArgs = args.map((arg) => this.sanitizeData(arg));
            console.error(`[${tag}]`, sanitizedMessage, ...sanitizedArgs);
        }
    }

    static info(tag: string, message: any, ...args: any[]) {
        if (__DEV__) {
            const sanitizedMessage = this.sanitizeData(message);
            const sanitizedArgs = args.map((arg) => this.sanitizeData(arg));
            console.warn(`[${tag}]`, sanitizedMessage, ...sanitizedArgs);
        }
    }

    static warn(tag: string, message: any, ...args: any[]) {
        if (__DEV__) {
            const sanitizedMessage = this.sanitizeData(message);
            const sanitizedArgs = args.map((arg) => this.sanitizeData(arg));
            console.warn(`[${tag}]`, sanitizedMessage, ...sanitizedArgs);
        }
    }

    static debug(tag: string, message: any, ...args: any[]) {
        if (__DEV__) {
            const sanitizedMessage = this.sanitizeData(message);
            const sanitizedArgs = args.map((arg) => this.sanitizeData(arg));
            console.warn(`[DEBUG][${tag}]`, sanitizedMessage, ...sanitizedArgs);
        }
    }
}

export default Logger;
