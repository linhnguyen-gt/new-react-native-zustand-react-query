#!/usr/bin/env node

/**
 * Computes the next release version and its notes, for the release workflow.
 *
 * Deliberately does not touch git beyond reading it: the workflow owns committing,
 * tagging and publishing, so this stays a pure "what would the next release be"
 * question that can be run locally, and unit-tested, without side effects on history.
 *
 * The only file it writes is package.json — the sole version that lives in version
 * control. Native versionName/versionCode and the app's runtime version come from the
 * .env files through app.config.ts and the config plugin, which CI has no business
 * rewriting; see plugins/with-environment-support.cjs.
 *
 * Usage:
 *   node scripts/prepare-release.cjs --bump=auto|major|minor|patch
 *   node scripts/prepare-release.cjs --version=1.4.0
 *   node scripts/prepare-release.cjs --bump=minor --dry-run
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const PACKAGE_JSON = path.join(PROJECT_ROOT, 'package.json');
const BUMP_LEVELS = ['major', 'minor', 'patch'];

// Ordered: this is also the order sections appear in the notes.
const SECTIONS = [
    { title: '⚠️ Breaking Changes', types: [], breaking: true },
    { title: '✨ Features', types: ['feat'] },
    { title: '🐛 Bug Fixes', types: ['fix'] },
    { title: '⚡ Performance', types: ['perf'] },
    { title: '♻️ Refactoring', types: ['refactor'] },
    { title: '📝 Documentation', types: ['docs'] },
    { title: '✅ Tests', types: ['test'] },
    { title: '🔧 Build & CI', types: ['build', 'ci'] },
    { title: '🧹 Chores', types: ['chore', 'style', 'revert'] },
    { title: '📦 Other', types: [null] },
];

const RECORD_SEPARATOR = '\x1e';
const FIELD_SEPARATOR = '\x1f';

const git = (args) => execFileSync('git', args, { cwd: PROJECT_ROOT, encoding: 'utf8' }).trim();

const parseArgs = (argv) => {
    const args = { bump: 'auto', version: null, dryRun: false };

    for (const arg of argv) {
        const [key, value] = arg.split('=');

        switch (key) {
            case '--bump':
                args.bump = (value || '').toLowerCase();
                break;
            case '--version':
                args.version = value || '';
                break;
            case '--dry-run':
                args.dryRun = true;
                break;
            default:
                throw new Error(`Unknown argument: ${arg}`);
        }
    }

    return args;
};

const parseVersion = (value) => {
    // Anchored and exactly three numeric parts: a prerelease or build suffix would make
    // every later bump ambiguous, and this project has no use for one.
    const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(value).trim());

    if (!match) {
        throw new Error(`Not a plain semver version: "${value}"`);
    }

    return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
};

const nextVersion = (current, level) => {
    const { major, minor, patch } = parseVersion(current);

    switch (level) {
        case 'major':
            return `${major + 1}.0.0`;
        case 'minor':
            return `${major}.${minor + 1}.0`;
        case 'patch':
            return `${major}.${minor}.${patch + 1}`;
        default:
            throw new Error(`Unknown bump level: "${level}"`);
    }
};

/**
 * Splits a conventional-commit subject into its parts.
 *
 * A subject that does not follow the convention yields `type: null` rather than
 * throwing — commitlint guards new commits, but history predating it, and anything
 * landed with --no-verify, still has to appear in the notes instead of vanishing.
 */
const parseCommit = ({ subject, body = '', sha = '' }) => {
    const match = /^(?<type>[a-z]+)(?:\((?<scope>[^)]*)\))?(?<bang>!)?:\s*(?<description>.+)$/i.exec(subject.trim());
    // `!` in the subject or a BREAKING CHANGE footer — the convention accepts either,
    // and using only the footer is common when the subject is already long.
    const breakingFooter = /^BREAKING[ -]CHANGE:/m.test(body);

    if (!match) {
        return { type: null, scope: null, breaking: breakingFooter, description: subject.trim(), sha };
    }

    return {
        type: match.groups.type.toLowerCase(),
        scope: match.groups.scope || null,
        breaking: Boolean(match.groups.bang) || breakingFooter,
        description: match.groups.description.trim(),
        sha,
    };
};

const detectLevel = (commits) => {
    if (commits.some((commit) => commit.breaking)) {
        return 'major';
    }

    if (commits.some((commit) => commit.type === 'feat')) {
        return 'minor';
    }

    return 'patch';
};

const previousTag = () => {
    // --merged HEAD so a tag on an unrelated branch cannot become the range start and
    // silently truncate the notes. -v:refname sorts by version, not by tag date, so a
    // late-created tag for an old version does not jump to the front.
    const tags = git(['tag', '--list', 'v*', '--merged', 'HEAD', '--sort=-v:refname']);

    return tags ? tags.split('\n')[0].trim() : null;
};

const commitsSince = (tag) => {
    const range = tag ? `${tag}..HEAD` : 'HEAD';
    const output = git([
        'log',
        range,
        '--no-merges',
        `--format=%h${FIELD_SEPARATOR}%s${FIELD_SEPARATOR}%b${RECORD_SEPARATOR}`,
    ]);

    return output
        .split(RECORD_SEPARATOR)
        .map((record) => record.trim())
        .filter(Boolean)
        .map((record) => {
            const [sha, subject, body] = record.split(FIELD_SEPARATOR);

            return parseCommit({ sha, subject: subject || '', body: body || '' });
        });
};

const formatEntry = (commit) => {
    const scope = commit.scope ? `**${commit.scope}**: ` : '';
    const sha = commit.sha ? ` (${commit.sha})` : '';

    return `- ${scope}${commit.description}${sha}`;
};

const buildNotes = ({ commits, tag, previousTag: from, repository }) => {
    const lines = [];

    for (const section of SECTIONS) {
        const entries = commits.filter((commit) =>
            section.breaking ? commit.breaking : !commit.breaking && section.types.includes(commit.type)
        );

        if (entries.length === 0) {
            continue;
        }

        lines.push(`### ${section.title}`, '', ...entries.map(formatEntry), '');
    }

    if (lines.length === 0) {
        lines.push('No changes recorded since the previous release.', '');
    }

    if (repository) {
        const compare = from
            ? `https://github.com/${repository}/compare/${from}...${tag}`
            : `https://github.com/${repository}/commits/${tag}`;

        lines.push(`**Full Changelog**: ${compare}`);
    }

    return lines.join('\n').trim() + '\n';
};

const writePackageVersion = (version) => {
    const raw = fs.readFileSync(PACKAGE_JSON, 'utf8');
    // Targeted replacement of the first "version" key rather than a JSON round-trip:
    // rewriting the whole file would reformat it against whatever JSON.stringify feels
    // like, producing a release commit whose diff is the entire manifest.
    const updated = raw.replace(/("version"\s*:\s*")[^"]*(")/, `$1${version}$2`);

    if (updated === raw) {
        throw new Error('Could not find a "version" field to update in package.json');
    }

    fs.writeFileSync(PACKAGE_JSON, updated);
};

const emitOutputs = (outputs) => {
    const target = process.env.GITHUB_OUTPUT;

    if (!target) {
        return;
    }

    const payload = Object.entries(outputs)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

    fs.appendFileSync(target, `${payload}\n`);
};

const main = () => {
    const args = parseArgs(process.argv.slice(2));
    const currentVersion = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf8')).version;
    const from = previousTag();
    const commits = commitsSince(from);

    let version;

    if (args.version) {
        version = parseVersion(args.version) && args.version.trim();
    } else if (args.bump === 'auto') {
        version = nextVersion(currentVersion, detectLevel(commits));
    } else if (BUMP_LEVELS.includes(args.bump)) {
        version = nextVersion(currentVersion, args.bump);
    } else {
        throw new Error(`--bump must be one of auto, ${BUMP_LEVELS.join(', ')} (got "${args.bump}")`);
    }

    const tag = `v${version}`;

    if (git(['tag', '--list', tag])) {
        throw new Error(`Tag ${tag} already exists — bump to a different version or delete the tag.`);
    }

    const notes = buildNotes({ commits, tag, previousTag: from, repository: process.env.GITHUB_REPOSITORY });
    const notesFile = path.join(process.env.RUNNER_TEMP || os.tmpdir(), 'release-notes.md');

    if (!args.dryRun) {
        writePackageVersion(version);
        fs.writeFileSync(notesFile, notes);
    }

    emitOutputs({
        version,
        tag,
        previous_tag: from || '',
        notes_file: notesFile,
        commit_count: commits.length,
    });

    console.log(`Previous release: ${from || '(none)'}`);
    console.log(`Current version:  ${currentVersion}`);
    console.log(`Next version:     ${version} (${tag})`);
    console.log(`Commits included: ${commits.length}`);
    console.log(`\n${notes}`);

    if (commits.length === 0) {
        console.warn('⚠️  No commits since the previous release.');
    }
};

if (require.main === module) {
    try {
        main();
    } catch (error) {
        console.error(`❌ ${error.message}`);
        process.exit(1);
    }
}

module.exports = { parseArgs, parseVersion, nextVersion, parseCommit, detectLevel, buildNotes };
