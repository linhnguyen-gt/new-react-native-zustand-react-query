const {
    parseArgs,
    parseVersion,
    nextVersion,
    parseCommit,
    detectLevel,
    buildNotes,
} = require('../prepare-release.cjs');

describe('parseArgs', () => {
    it('defaults to an automatic bump', () => {
        expect(parseArgs([])).toEqual({ bump: 'auto', version: null, dryRun: false });
    });

    it('reads the bump level and the version override', () => {
        expect(parseArgs(['--bump=MINOR', '--version=2.1.0', '--dry-run'])).toEqual({
            bump: 'minor',
            version: '2.1.0',
            dryRun: true,
        });
    });

    it('rejects unknown arguments instead of ignoring them', () => {
        expect(() => parseArgs(['--bmup=minor'])).toThrow('Unknown argument');
    });
});

describe('parseVersion', () => {
    it.each(['1.2', 'v1.2.3', '1.2.3-beta.1', 'latest', ''])('rejects %p', (value) => {
        expect(() => parseVersion(value)).toThrow('Not a plain semver version');
    });
});

describe('nextVersion', () => {
    it.each([
        ['major', '2.0.0'],
        ['minor', '1.5.0'],
        ['patch', '1.4.3'],
    ])('bumps %s', (level, expected) => {
        expect(nextVersion('1.4.2', level)).toBe(expected);
    });

    it('zeroes the lower components rather than carrying them forward', () => {
        expect(nextVersion('1.4.2', 'major')).toBe('2.0.0');
        expect(nextVersion('1.4.2', 'minor')).toBe('1.5.0');
    });
});

describe('parseCommit', () => {
    it('splits type, scope and description', () => {
        expect(parseCommit({ subject: 'feat(auth): add refresh token', sha: 'abc1234' })).toEqual({
            type: 'feat',
            scope: 'auth',
            breaking: false,
            description: 'add refresh token',
            sha: 'abc1234',
        });
    });

    it('treats a bang in the subject as breaking', () => {
        expect(parseCommit({ subject: 'refactor(api)!: drop v1 endpoints' }).breaking).toBe(true);
    });

    it('treats a BREAKING CHANGE footer as breaking', () => {
        const commit = parseCommit({
            subject: 'feat: new storage layer',
            body: 'BREAKING CHANGE: the cache format changed',
        });

        expect(commit.breaking).toBe(true);
    });

    // History predating commitlint, and anything landed with --no-verify, still has to
    // reach the notes — a throw here would drop it silently.
    it('keeps a non-conventional subject as an untyped entry', () => {
        expect(parseCommit({ subject: 'update readme' })).toMatchObject({
            type: null,
            scope: null,
            description: 'update readme',
        });
    });
});

describe('detectLevel', () => {
    it('picks major when anything is breaking, even alongside features', () => {
        const commits = [parseCommit({ subject: 'feat: a' }), parseCommit({ subject: 'fix!: b' })];

        expect(detectLevel(commits)).toBe('major');
    });

    it('picks minor for a feature', () => {
        expect(detectLevel([parseCommit({ subject: 'feat: a' }), parseCommit({ subject: 'fix: b' })])).toBe('minor');
    });

    it('picks patch for anything else, including an empty range', () => {
        expect(detectLevel([parseCommit({ subject: 'chore: deps' })])).toBe('patch');
        expect(detectLevel([])).toBe('patch');
    });
});

describe('buildNotes', () => {
    const commits = [
        parseCommit({ subject: 'feat(auth): add refresh token', sha: 'aaa1111' }),
        parseCommit({ subject: 'fix(api)!: reject cleartext urls', sha: 'bbb2222' }),
        parseCommit({ subject: 'chore: bump deps', sha: 'ccc3333' }),
        parseCommit({ subject: 'update readme', sha: 'ddd4444' }),
    ];

    it('groups by section and lists a breaking change only under Breaking Changes', () => {
        const notes = buildNotes({ commits, tag: 'v1.1.0', previousTag: 'v1.0.0', repository: 'acme/app' });

        expect(notes).toContain('### ⚠️ Breaking Changes');
        expect(notes).toContain('- **api**: reject cleartext urls (bbb2222)');
        expect(notes).toContain('### ✨ Features');
        expect(notes).toContain('- **auth**: add refresh token (aaa1111)');
        expect(notes).toContain('### 📦 Other');
        expect(notes).toContain('- update readme (ddd4444)');
        // Would otherwise appear twice: once as breaking, once under Bug Fixes.
        expect(notes.match(/reject cleartext urls/g)).toHaveLength(1);
    });

    it('links the compare range against the previous tag', () => {
        const notes = buildNotes({ commits, tag: 'v1.1.0', previousTag: 'v1.0.0', repository: 'acme/app' });

        expect(notes).toContain('https://github.com/acme/app/compare/v1.0.0...v1.1.0');
    });

    it('links the full commit list for a first release', () => {
        const notes = buildNotes({ commits, tag: 'v1.0.0', previousTag: null, repository: 'acme/app' });

        expect(notes).toContain('https://github.com/acme/app/commits/v1.0.0');
    });

    it('states plainly when the range is empty', () => {
        const notes = buildNotes({ commits: [], tag: 'v1.0.1', previousTag: 'v1.0.0', repository: 'acme/app' });

        expect(notes).toContain('No changes recorded since the previous release.');
    });
});
