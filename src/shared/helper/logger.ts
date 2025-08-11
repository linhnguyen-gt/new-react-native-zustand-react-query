interface LogData {
    [key: string]: any;
}

class Logger {
    private static sanitizeData(data: any): any {
        if (typeof data === 'string') {
            return data
                .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/g, 'Bearer [REDACTED]')
                .replace(/password["\s]*[:=]["\s]*[^"\s,}]+/gi, 'password: [REDACTED]')
                .replace(/token["\s]*[:=]["\s]*[^"\s,}]+/gi, 'token: [REDACTED]')
                .replace(/key["\s]*[:=]["\s]*[^"\s,}]+/gi, 'key: [REDACTED]')
                .replace(/secret["\s]*[:=]["\s]*[^"\s,}]+/gi, 'secret: [REDACTED]');
        }

        if (typeof data === 'object' && data !== null) {
            const sanitized: LogData = {};
            for (const [key, value] of Object.entries(data)) {
                const sensitiveKeys = ['password', 'token', 'secret', 'key', 'authorization', 'auth'];
                if (sensitiveKeys.some((sensitiveKey) => key.toLowerCase().includes(sensitiveKey))) {
                    sanitized[key] = '[REDACTED]';
                } else {
                    sanitized[key] = this.sanitizeData(value);
                }
            }
            return sanitized;
        }

        return data;
    }

    static error(tag: string, message: any, ...args: any[]) {
        const sanitizedMessage = this.sanitizeData(message);
        const sanitizedArgs = args.map((arg) => this.sanitizeData(arg));

        if (__DEV__) {
            console.error(`[${tag}]`, sanitizedMessage, ...sanitizedArgs);
        }
    }

    static info(tag: string, message: any, ...args: any[]) {
        const sanitizedMessage = this.sanitizeData(message);
        const sanitizedArgs = args.map((arg) => this.sanitizeData(arg));

        if (__DEV__) {
            // eslint-disable-next-line no-console
            console.log(`[${tag}]`, sanitizedMessage, ...sanitizedArgs);
        }
    }

    static warn(tag: string, message: any, ...args: any[]) {
        const sanitizedMessage = this.sanitizeData(message);
        const sanitizedArgs = args.map((arg) => this.sanitizeData(arg));

        if (__DEV__) {
            console.warn(`[${tag}]`, sanitizedMessage, ...sanitizedArgs);
        }
    }

    static debug(tag: string, message: any, ...args: any[]) {
        if (__DEV__) {
            const sanitizedMessage = this.sanitizeData(message);
            const sanitizedArgs = args.map((arg) => this.sanitizeData(arg));
            // eslint-disable-next-line no-console
            console.log(`[DEBUG][${tag}]`, sanitizedMessage, ...sanitizedArgs);
        }
    }
}

export default Logger;
