import { assertValidApiUrl } from '../api-url';

/**
 * The transport floor.
 *
 * `.env.example` shipped `http://localhost:3000` as the template every environment is
 * copied from, so an operator editing the host but not the scheme produced a cleartext
 * production build. That fails asymmetrically — Android blocks cleartext outright while
 * iOS ships `NSAllowsLocalNetworking: true` in the production Info.plist — so the same
 * misconfiguration looks like a total outage on one platform and works on the other.
 */
describe('assertValidApiUrl', () => {
    describe('a missing value', () => {
        it.each([
            ['empty', ''],
            ['whitespace only', '   '],
        ])('rejects %s', (_label, value) => {
            // appConfig falls back to '' and axios reads an empty baseURL as "relative to
            // the current location", so every request goes somewhere meaningless and
            // fails far from the actual cause. Refusing to start is cheaper.
            expect(() => assertValidApiUrl(value, 'development')).toThrow(/API_URL is not set/);
        });

        it('names the variable and the variant so the message is actionable', () => {
            expect(() => assertValidApiUrl('', 'staging')).toThrow(/API_URL.*"staging"/s);
        });
    });

    describe('the https floor', () => {
        it.each(['staging', 'production'] as const)('rejects cleartext for %s', (variant) => {
            expect(() => assertValidApiUrl('http://api.example.com', variant)).toThrow(/must use https/);
        });

        it.each(['staging', 'production'] as const)('accepts https for %s', (variant) => {
            expect(assertValidApiUrl('https://api.example.com', variant)).toBe('https://api.example.com');
        });

        it('allows cleartext for development, so a local server still works', () => {
            expect(assertValidApiUrl('http://localhost:3000', 'development')).toBe('http://localhost:3000');
        });

        it('rejects a scheme it does not recognise at all', () => {
            expect(() => assertValidApiUrl('api.example.com', 'development')).toThrow(/must start with/);
        });

        it('rejects a single-slash scheme', () => {
            expect(() => assertValidApiUrl('https:/api.example.com', 'production')).toThrow(/must start with/);
        });

        it.each(['https://', 'https:///posts', 'https://?x=1'])('rejects "%s", which has no host', (value) => {
            // Passes a scheme-prefix test but resolves every request against nothing.
            expect(() => assertValidApiUrl(value, 'development')).toThrow(/no host/);
        });

        it('rejects credentials embedded in the URL', () => {
            // errorContext.endpoint carries the request URL into every log line and
            // breadcrumb, so a password here leaks everywhere an error is recorded.
            expect(() => assertValidApiUrl('https://user:pass@api.example.com', 'production')).toThrow(
                /must not embed credentials/
            );
        });

        it('accepts a host with a port and a path prefix', () => {
            expect(assertValidApiUrl('https://api.example.com:8443/v2', 'production')).toBe(
                'https://api.example.com:8443/v2'
            );
        });

        it('is case-insensitive about the scheme', () => {
            expect(assertValidApiUrl('HTTPS://api.example.com', 'production')).toBe('HTTPS://api.example.com');
        });
    });

    it('trims surrounding whitespace rather than failing on it', () => {
        // A trailing space in a .env value is an easy typo and not worth a hard failure.
        expect(assertValidApiUrl('  https://api.example.com  ', 'production')).toBe('https://api.example.com');
    });
});
