import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * The canonical database is the root-level mediarr.db, pointed to by
 * DATABASE_URL="file:../mediarr.db" in .env.  Any other .db files in the
 * repo are stale artefacts that cause confusion and should not exist.
 */
const REPO_ROOT = path.resolve(__dirname, '../../..');

const FORBIDDEN_DB_PATHS = [
  'data/mediarr.db',
  'prisma/dev.db',
  'prisma/mediarr.db',
  'server/mediarr.db',
];

describe('stray database files', () => {
  for (const rel of FORBIDDEN_DB_PATHS) {
    it(`${rel} must not exist`, () => {
      const fullPath = path.join(REPO_ROOT, rel);
      expect(
        fs.existsSync(fullPath),
        `Stray DB file found at ${fullPath} — delete it; the canonical DB is the root mediarr.db`,
      ).toBe(false);
    });
  }
});
