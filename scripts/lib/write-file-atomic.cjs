const fs = require('fs');
const path = require('path');

/**
 * Writes a file without leaving it half-written if the process dies mid-write.
 *
 * `fs.writeFileSync` truncates the target and then writes. Interrupt it — Ctrl-C during
 * a build, a full disk, the OOM killer — and the file is left truncated. These are
 * git-tracked native project files: a partial `project.pbxproj` or `build.gradle` does
 * not fail loudly, it fails as a confusing parse error in Xcode or Gradle, and the
 * recovery (`git checkout`) is only obvious once you suspect the file at all.
 *
 * **Scope: process death, not power loss.** There is no `fsync` here, so the rename can
 * reach disk before the data does and a machine that loses power mid-write can still end
 * up with a damaged file. Adding `fsync` on the temp file and its directory would close
 * that, at a real cost per write; for regenerable build files that trade is not worth
 * making. Do not read this as durability.
 *
 * The temp file is deliberately created in the SAME directory as the target. `rename` is
 * atomic only within a filesystem, so a temp file in the system temp directory could land
 * on a different volume and degrade to a copy — reintroducing the partial write this
 * exists to prevent. The pid suffix keeps concurrent runs from colliding; two of them
 * still race to be last, which is an overwrite rather than corruption.
 *
 * A symlinked target is replaced rather than followed. No current caller passes one.
 *
 * @param filePath destination
 * @param contents full file contents
 * @param encoding defaults to utf8
 */
const writeFileAtomic = (filePath, contents, encoding = 'utf8') => {
    const directory = path.dirname(filePath);
    const tempPath = path.join(directory, `.${path.basename(filePath)}.${process.pid}.tmp`);

    try {
        fs.writeFileSync(tempPath, contents, encoding);

        // Carry the original mode across. `writeFileSync` creates the temp at
        // `0666 & ~umask`, so a target with non-default permissions would quietly lose
        // them on every sync.
        try {
            fs.chmodSync(tempPath, fs.statSync(filePath).mode);
        } catch {
            // No original to copy from — a fresh file keeps the default mode.
        }

        fs.renameSync(tempPath, filePath);
    } catch (error) {
        // A stray temp file next to a tracked file shows up as an untracked artifact in
        // every later `git status`. This cannot catch a signal, though — see the
        // `.*.tmp` entry in .gitignore for the Ctrl-C case.
        fs.rmSync(tempPath, { force: true });
        throw error;
    }
};

module.exports = { writeFileAtomic };
