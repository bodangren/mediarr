import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Guard for the module-boundary trap in tech-debt 2026-07-27: the root tsconfig uses
 * `module: nodenext` while `server/tsconfig.json` uses `preserve`, so a *static* import from
 * `scripts/` into `server/` collapses to a default-only CJS namespace and fails at load with
 * "does not provide an export named …". `scripts/run-migrations.ts` and
 * `scripts/reconcile-migration-compatibility.ts` therefore use dynamic `import()`.
 *
 * This test keeps that rule enforceable: new scripts that statically import `server/` fail here
 * instead of failing only when someone runs `npm run migrate`.
 */
describe('scripts/ -> server/ import boundary', () => {
  const repoRoot = path.resolve(__dirname, '..', '..', '..');
  const scriptsDir = path.join(repoRoot, 'scripts');

  it('uses only dynamic imports from server code', () => {
    const offenders: string[] = [];
    for (const file of fs.readdirSync(scriptsDir)) {
      if (!/\.(ts|mts|js|mjs)$/.test(file) || file.endsWith('.test.ts')) continue;
      const text = fs.readFileSync(path.join(scriptsDir, file), 'utf-8');
      // Type-only imports are erased at compile time and never cross the runtime boundary.
      for (const match of text.matchAll(/^\s*import\s+(?!type\b)[^;]*?from\s+['"]([^'"]+)['"]/gm)) {
        const specifier = match[1]!;
        if (/^(?:\.\.\/)+server\//.test(specifier) || /(?:^|\/)server\/src\//.test(specifier)) {
          offenders.push(`${file}: static import from ${specifier}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
