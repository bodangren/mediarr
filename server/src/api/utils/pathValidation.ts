import path from 'node:path';

/**
 * Path-traversal guard for filesystem operations exposed over the API.
 *
 * Mediarr is deployed in trusted-LAN mode (see measure/workflow.md
 * "Security Scope Decision (2026-03-05)"), so we do NOT add API-key or
 * user-level auth. We DO, however, validate every user-supplied path
 * before it touches the filesystem: a `..` segment or an absolute
 * outside-root path could otherwise let a LAN client read or write
 * anywhere the server user can.
 *
 * The check is intentionally simple — `path.resolve` followed by
 * `path.relative` — so it has no surprises on cross-platform path
 * separators (`/` on POSIX, `\` on Windows).
 *
 * Usage:
 *   if (!isPathWithinRoots(userPath, rootFolders)) {
 *     throw new ValidationError(`Path is outside configured root folders`);
 *   }
 */
export function isPathWithinRoots(
  candidatePath: string,
  rootFolders: string[],
): boolean {
  if (typeof candidatePath !== 'string' || candidatePath.length === 0) {
    return false;
  }
  if (!Array.isArray(rootFolders) || rootFolders.length === 0) {
    return false;
  }

  const resolved = path.resolve(candidatePath);
  for (const root of rootFolders) {
    if (typeof root !== 'string' || root.length === 0) continue;
    const resolvedRoot = path.resolve(root);
    const rel = path.relative(resolvedRoot, resolved);

    // path.relative returns "" for identical paths, "../..." for paths
    // outside, and a normalized path inside. We also reject absolute
    // returns (Windows volume roots) and paths that start with "..".
    if (rel.length === 0) return true;
    if (rel.startsWith('..')) continue;
    if (path.isAbsolute(rel)) continue;
    return true;
  }
  return false;
}
