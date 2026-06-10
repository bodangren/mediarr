import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * FR-4.4: season-pack corner-case regression tests.
 *
 * The ImportManager's per-torrent loop must:
 *  1. Iterate over every file in a multi-file S01E01..E10 pack.
 *  2. Handle a single-file S01E01 release.
 *  3. Treat extras / non-episode entries as opaque file paths (the
 *     filesystem scanner filters them; the loop itself does not drop them).
 *  4. Wrap each iteration in its own try/catch so a single bad file does
 *     not abort the whole torrent (FR-4.3).
 *
 * The structural assertions in this file pin the loop's invariants so
 * refactors don't accidentally break the per-file safety net. A more
 * thorough integration test would drive the real `processTorrent` method
 * with a stubbed prisma + filesystem; that lives in
 * ImportManager.slowPath.test.ts.
 */
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const IMPORT_MANAGER_PATH = path.join(REPO_ROOT, 'server', 'src', 'services', 'ImportManager.ts');

function readImportManager(): string {
  return fs.readFileSync(IMPORT_MANAGER_PATH, 'utf8');
}

describe('ImportManager season-pack loop (FR-4.3, FR-4.4)', () => {
  it('iterates over every file in the torrent with a for-of loop', () => {
    const source = readImportManager();
    expect(source).toMatch(/for\s*\(\s*const\s+filePath\s+of\s+files\s*\)/);
  });

  it('wraps each iteration body in its own try/catch so one bad file does not abort the torrent', () => {
    const source = readImportManager();
    const loopStart = source.indexOf('for (const filePath of files)');
    expect(loopStart, 'loop start must exist').toBeGreaterThan(-1);

    // Find the matching closing brace of the for-loop. Walk character by
    // character so we don't get confused by nested braces in object literals.
    let depth = 0;
    let inString: string | null = null;
    let i = source.indexOf('{', loopStart);
    expect(i, 'loop must open with {').toBeGreaterThan(-1);
    let loopEnd = -1;
    for (; i < source.length; i += 1) {
      const ch = source[i];
      if (inString) {
        if (ch === '\\') { i += 1; continue; }
        if (ch === inString) inString = null;
        continue;
      }
      if (ch === '"' || ch === "'" || ch === '`') { inString = ch; continue; }
      if (ch === '{') depth += 1;
      else if (ch === '}') {
        depth -= 1;
        if (depth === 0) { loopEnd = i; break; }
      }
    }
    expect(loopEnd, 'loop must have a matching closing brace').toBeGreaterThan(-1);
    const body = source.slice(loopStart, loopEnd + 1);

    expect(body, 'loop body must contain a try {').toMatch(/try\s*\{/);
    expect(body, 'loop body must contain a matching catch').toMatch(/catch\s*\(/);
  });

  it('emits a per-file IMPORT_FAILED event when a single file throws', () => {
    const source = readImportManager();
    // The catch handler should call activityEventEmitter.emit with eventType
    // 'IMPORT_FAILED' and the filename in the summary. This is the user-
    // visible signal that one file failed but the torrent is still being
    // processed.
    const loopMatch = source.match(/for \(const filePath of files\)[\s\S]*?\n    \}/);
    expect(loopMatch, 'loop must be findable').not.toBeNull();
    const body = loopMatch![0];
    expect(body).toMatch(/IMPORT_FAILED/);
    expect(body).toMatch(/activityEventEmitter\??\.emit/);
  });
});
