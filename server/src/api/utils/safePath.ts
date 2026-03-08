import path from 'node:path';

/**
 * Resolve a file path and verify it stays within the expected base directory.
 * Prevents path-traversal attacks where user-supplied segments escape the root.
 *
 * @param base - The trusted root directory (e.g. a configured root folder path).
 * @param segments - Path segments to join onto the base.
 * @returns The resolved absolute path.
 * @throws Error if the resolved path escapes the base directory.
 */
export function safePath(base: string, ...segments: string[]): string {
  const resolvedBase = path.resolve(base);
  const resolved = path.resolve(resolvedBase, ...segments);

  if (!resolved.startsWith(resolvedBase + path.sep) && resolved !== resolvedBase) {
    throw new Error(`Path traversal detected: resolved path '${resolved}' escapes base '${resolvedBase}'`);
  }

  return resolved;
}
