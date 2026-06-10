import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = path.resolve(__dirname, '..', '..');

const REPO_DIRS = [
  path.join(REPO_ROOT, 'server', 'src', 'repositories'),
  path.join(REPO_ROOT, 'server', 'src', 'services'),
  path.join(REPO_ROOT, 'app', 'src', 'components'),
];

/**
 * FR-3.8: detect orphan-alias files. An orphan file is one that only
 * re-exports a class extending another class without adding methods.
 * Examples: `export class SeriesService extends MediaService {}` (6 lines,
 * 0 importers) or a `ShellLayout.tsx` that 9 lines long with 0 imports.
 */
function listTypeScriptFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '__tests__' || entry.name === 'dist') continue;
      out.push(...listTypeScriptFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\.(ts|tsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function isOrphanAliasFile(content: string): boolean {
  const stripped = content
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .trim();
  if (stripped.length === 0) return false;

  const onlyExtends = /^(?:export\s+)?(?:default\s+)?(?:abstract\s+)?class\s+\w+\s+extends\s+[\w.]+(?:\s*<[^>]*>)?\s*(?:implements\s+[^{]*)?\{\s*\}\s*$/m;
  const onlyReExport = /^(?:export\s+(?:\{[^}]+\}|const\s+\w+\s*=\s*\w+;|type\s+\w+\s*=\s*[\w.]+;|interface\s+\w+\s*(?:<[^>]*>)?\s*\{\s*\}))\s*$/m;
  const onlyImport = /^import\s.+$/;

  return Boolean(onlyExtends.test(stripped) || (onlyReExport.test(stripped) && !onlyImport.test(stripped) && stripped.length < 200));
}

describe('chore_core_integrity_20260610 — no orphan-alias files (FR-3.8)', () => {
  for (const dir of REPO_DIRS) {
    const label = path.relative(REPO_ROOT, dir);
    it(`scans ${label}/ for empty extends or trivial re-exports`, () => {
      const offenders: string[] = [];
      for (const file of listTypeScriptFiles(dir)) {
        const content = fs.readFileSync(file, 'utf8');
        if (isOrphanAliasFile(content)) {
          offenders.push(path.relative(REPO_ROOT, file));
        }
      }
      expect(offenders, `Orphan alias files found:\n  ${offenders.join('\n  ')}`).toEqual([]);
    });
  }
});
