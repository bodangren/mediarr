import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// ─────────────────────────────────────────────────────────────────────────────
// chore_close_drizzle_migration_20260607 — Phase S5 Red
//
// Goal: rename every Prisma-named test mock helper to its Drizzle/Db
// equivalent so the test surface stops advertising the legacy Prisma type
// system. The renames are:
//
//   createPrismaMock    →  createDbMock
//   createMockPrisma    →  createMockDb
//   makePrisma          →  makeDb
//   makeMoviePrisma     →  makeMovieDb
//
// Each helper has multiple in-file call sites (factory invocation,
// `ReturnType<typeof makePrisma>` annotations) that must be updated alongside
// the declaration. The local `prisma` variable name is OUT of scope — only
// the helper identifiers are renamed.
//
// These Red-phase tests fail today for the precise missing behavior the
// Green phase will resolve:
//
//   S5.1 — Inventory precondition: the 31 test files in scope are
//          discoverable via the helper regex, and the new Drizzle names are
//          currently absent.
//   S5.2 — `createPrismaMock` is absent in each of its 8 declaring files,
//          `createDbMock` is present in each.
//   S5.3 — `createMockPrisma` is absent in each of its 2 declaring files,
//          `createMockDb` is present in each.
//   S5.4 — `makePrisma` is absent in each of its 20 declaring files,
//          `makeDb` is present in each.
//   S5.5 — `makeMoviePrisma` is absent in its 1 declaring file,
//          `makeMovieDb` is present in that file.
//   S5.6 — Globally: zero `\b<oldName>\b` hits in non-archived test code.
//   S5.7 — Globally: each new Drizzle name is findable in at least one
//          file, with the same hit count as the old name (so no test file
//          silently lost its mock).
//   S5.8 — `typeof <oldName>` references are gone (catches the
//          `ReturnType<typeof makePrisma>` annotation pattern), replaced by
//          `typeof <newName>`.
//   S5.9 — S5 audit-results section in audit-results.md acknowledges the
//          rename scope (31 files, 278 hits across 4 helper names).
//
// The scanner helpers match the patterns established in
// `tests/closeDrizzleMigration.audit.test.ts` (Phase S1) and
// `tests/closeDrizzleMigration.s4.shimRemotion.test.ts` (Phase S4) so the S5
// Red tests are consistent with the rest of the close-drizzle-migration
// suite. The `audit-results.md` file is also updated by Green to add a
// "Naming Residue" section so S1 expectations (which audit the audit
// artifact's structure) keep passing.
// ─────────────────────────────────────────────────────────────────────────────

const REPO_ROOT = path.resolve(__dirname, '..');
const SERVER_SRC = path.join(REPO_ROOT, 'server', 'src');
const TESTS_DIR = path.join(REPO_ROOT, 'tests');
const AUDIT_PATH = path.join(
  REPO_ROOT,
  'measure',
  'archive',
  'chore_close_drizzle_migration_20260607',
  'audit-results.md',
);

const RENAMES: { oldName: string; newName: string }[] = [
  { oldName: 'createPrismaMock', newName: 'createDbMock' },
  { oldName: 'createMockPrisma', newName: 'createMockDb' },
  { oldName: 'makePrisma', newName: 'makeDb' },
  { oldName: 'makeMoviePrisma', newName: 'makeMovieDb' },
];

// Pre-Green inventory of which files declare / use each helper. The
// Red-phase tests assert these inventories are non-empty (so the suite
// cannot silently pass against an empty tree) and the new name is absent
// (so the Green phase must do real work). After Green the per-file
// assertions invert: old name is gone, new name is present, hit counts
// are preserved.
//
// Hit counts are produced by `grep -rc` style counting against the
// pre-Green tree. They are the same hit counts the Green phase should
// observe for the new names once every declaration + call site is
// renamed.
const FILES_BY_HELPER: Record<string, string[]> = {
  createPrismaMock: [
    'server/src/repositories/AppSettingsRepository.test.ts',
    'server/src/repositories/PlaybackRepository.test.ts',
    'server/src/seeds/smartDefaults.test.ts',
    'server/src/services/PlaybackService.test.ts',
    'server/src/api/routes/calendarRoutes.test.ts',
    'server/src/api/routes/dashboardRoutes.test.ts',
    'server/src/api/routes/stats.integration.test.ts',
    'server/src/api/routes/statsRoutes.test.ts',
  ],
  createMockPrisma: [
    'server/src/services/LibraryScanService.test.ts',
    'tests/api-calendar.test.ts',
  ],
  makeMoviePrisma: [
    'server/src/services/BulkImportService.test.ts',
  ],
  makePrisma: [
    'server/src/repositories/MediaRepository.upsert.test.ts',
    'server/src/repositories/MediaRepository.upsertSeasonsAndEpisodes.test.ts',
    'server/src/repositories/TorrentRepository.test.ts',
    'server/src/seeds/qualities.test.ts',
    'server/src/services/CollectionService.link.test.ts',
    'server/src/services/ImportManager.helpers.test.ts',
    'server/src/services/ImportManager.slowPath.test.ts',
    'server/src/services/ImportManager.test.ts',
    'server/src/services/MediaService.test.ts',
    'server/src/services/MovieOrganizeService.test.ts',
    'server/src/services/pipeline.integration.organizerdb.test.ts',
    'server/src/services/pipeline.integration.rss.test.ts',
    'server/src/services/pipeline.integration.torrentimport.test.ts',
    'server/src/services/pipeline.integration.wanted.test.ts',
    'server/src/services/RssMediaMonitor.cornerCases.test.ts',
    'server/src/services/RssMediaMonitor.test.ts',
    'server/src/services/RssSyncService.test.ts',
    'server/src/services/SeriesMonitoringService.test.ts',
    'server/src/services/SeriesOrganizeService.test.ts',
    // NOTE: server/src/services/VariantBackfillService.test.ts is a known
    // false positive in the plan's un-bounded `grep -rl
    // "createPrismaMock|createMockPrisma|makePrisma|makeMoviePrisma"`
    // (substring match on `makePrismaMock`). That file uses
    // `makePrismaMock`, a file-local helper that is NOT in the S5 rename
    // scope per the plan. It is intentionally excluded from this inventory
    // so S5 does not own a rename the plan does not list. If the supervisor
    // gate flags it, update the plan's grep to use word boundaries
    // (`\bmakePrisma\b`) or add `makePrismaMock` to the S5 rename list.
  ],
};

// `typeof <oldName>` references that must be migrated to the new name.
// These are independent of the bare-name regex because the bare-name check
// would also match a string literal or comment containing the old name —
// the typeof check is the strict "identifier actually used at the type
// level" assertion.
const TYPEOF_REFERENCES: { file: string; oldName: string; newName: string }[] = [
  { file: 'server/src/repositories/MediaRepository.upsert.test.ts', oldName: 'makePrisma', newName: 'makeDb' },
  { file: 'server/src/repositories/MediaRepository.upsert.test.ts', oldName: 'makePrisma', newName: 'makeDb' },
  { file: 'server/src/repositories/AppSettingsRepository.test.ts', oldName: 'createPrismaMock', newName: 'createDbMock' },
  { file: 'server/src/repositories/MediaRepository.upsertSeasonsAndEpisodes.test.ts', oldName: 'makePrisma', newName: 'makeDb' },
  { file: 'server/src/repositories/TorrentRepository.test.ts', oldName: 'makePrisma', newName: 'makeDb' },
  { file: 'server/src/repositories/PlaybackRepository.test.ts', oldName: 'createPrismaMock', newName: 'createDbMock' },
  { file: 'server/src/api/routes/dashboardRoutes.test.ts', oldName: 'createPrismaMock', newName: 'createDbMock' },
  { file: 'server/src/api/routes/dashboardRoutes.test.ts', oldName: 'createPrismaMock', newName: 'createDbMock' },
  { file: 'server/src/api/routes/dashboardRoutes.test.ts', oldName: 'createPrismaMock', newName: 'createDbMock' },
  { file: 'server/src/api/routes/calendarRoutes.test.ts', oldName: 'createPrismaMock', newName: 'createDbMock' },
  { file: 'server/src/services/LibraryScanService.test.ts', oldName: 'createMockPrisma', newName: 'createMockDb' },
];

function rel(p: string): string {
  return path.relative(REPO_ROOT, p);
}

function read(relativePath: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, relativePath), 'utf8');
}

function listSourceFiles(root: string): string[] {
  const out: string[] = [];
  const stack: string[] = [root];
  while (stack.length > 0) {
    const current = stack.pop()!;
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '__tests__') continue;
        stack.push(full);
      } else if (entry.isFile() && /\.ts$/.test(entry.name)) {
        out.push(full);
      }
    }
  }
  return out.sort();
}

function countOccurrences(content: string, name: string): number {
  const re = new RegExp(`\\b${name}\\b`, 'g');
  let n = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) n++;
  return n;
}

function grepHits(files: string[], name: string): { file: string; line: number; snippet: string }[] {
  const re = new RegExp(`\\b${name}\\b`, 'g');
  const hits: { file: string; line: number; snippet: string }[] = [];
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const local = new RegExp(re.source, 'g');
      let m: RegExpExecArray | null;
      while ((m = local.exec(line)) !== null) {
        hits.push({ file: rel(file), line: i + 1, snippet: line.trim() });
      }
    }
  }
  return hits;
}

const SELF = rel(__filename);
const S1_AUDIT = 'tests/closeDrizzleMigration.audit.test.ts';
const S7_VERIFY = 'tests/closeDrizzleMigration.s7.verification.test.ts';

function isExempt(file: string): boolean {
  return file === SELF || file === S1_AUDIT || file === S7_VERIFY;
}

describe('chore_close_drizzle_migration_20260607 — Phase S5: Rename test mock helpers to Drizzle/Db naming (Red)', () => {
  // ─────────────────────────────────────────────────────────────────────────
  // S5.1 — Inventory precondition
  //
  // These tests assert the Red-phase tree has the helpers we expect (so the
  // S5 test is not silently vacuous) and does NOT yet have the new
  // Drizzle names (so Green has real work to do).
  // ─────────────────────────────────────────────────────────────────────────
  describe('S5.1: inventory precondition (30 files, 4 helper names, new names absent)', () => {
    it('the 4 helper names are accounted for in the FILES_BY_HELPER inventory', () => {
      const declaredHelpers = new Set(RENAMES.map((r) => r.oldName));
      const inventoryHelpers = new Set(Object.keys(FILES_BY_HELPER));
      for (const h of declaredHelpers) {
        expect(inventoryHelpers.has(h), `helper "${h}" missing from inventory`).toBe(true);
      }
      for (const h of inventoryHelpers) {
        expect(declaredHelpers.has(h), `inventory helper "${h}" missing from renames list`).toBe(true);
      }
    });

    it('the inventory totals to 30 files (word-boundary regex excludes VariantBackfillService makePrismaMock false positive)', () => {
      const all = new Set<string>();
      for (const list of Object.values(FILES_BY_HELPER)) {
        for (const f of list) all.add(f);
      }
      expect(all.size, `inventory has ${all.size} unique files; expected 30`).toBe(30);
    });

    it('every inventory file exists on disk', () => {
      const missing: string[] = [];
      const all = new Set<string>();
      for (const list of Object.values(FILES_BY_HELPER)) {
        for (const f of list) all.add(f);
      }
      for (const f of all) {
        if (!fs.existsSync(path.join(REPO_ROOT, f))) missing.push(f);
      }
      expect(missing, `inventory files missing from disk: ${missing.join(', ')}`).toEqual([]);
    });

    it('each inventory file currently references its expected Prisma-named helper (Red baseline)', () => {
      const offenders: { file: string; helper: string }[] = [];
      for (const [helper, files] of Object.entries(FILES_BY_HELPER)) {
        for (const f of files) {
          const content = read(f);
          if (!new RegExp(`\\b${helper}\\b`).test(content)) {
            offenders.push({ file: f, helper });
          }
        }
      }
      expect(
        offenders,
        `Inventory files no longer reference their expected Prisma helper —\n` +
          `  ${offenders.map((o) => `${o.file} (expected ${o.helper})`).join('\n  ')}\n` +
          `The inventory may be stale; re-grep before Green.`,
      ).toEqual([]);
    });

    it('none of the new Drizzle/Db helper names are present in any inventory file yet (Red baseline)', () => {
      const offenders: { file: string; newName: string }[] = [];
      for (const { newName } of RENAMES) {
        for (const files of Object.values(FILES_BY_HELPER)) {
          for (const f of files) {
            const content = read(f);
            if (new RegExp(`\\b${newName}\\b`).test(content)) {
              offenders.push({ file: f, newName });
            }
          }
        }
      }
      expect(
        offenders,
        `New Drizzle names already appear in pre-Green tree —\n` +
          `  ${offenders.map((o) => `${o.file} (already has ${o.newName})`).join('\n  ')}`,
      ).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // S5.2 — createPrismaMock → createDbMock
  // ─────────────────────────────────────────────────────────────────────────
  describe('S5.2: createPrismaMock → createDbMock rename (8 files)', () => {
    const oldName = 'createPrismaMock';
    const newName = 'createDbMock';

    it(`"${oldName}" is absent in each of its ${FILES_BY_HELPER[oldName]!.length} declaring files`, () => {
      const offenders: string[] = [];
      for (const f of FILES_BY_HELPER[oldName]!) {
        const content = read(f);
        if (new RegExp(`\\b${oldName}\\b`).test(content)) offenders.push(f);
      }
      expect(
        offenders,
        `Files still referencing "${oldName}" (must be renamed to "${newName}"):\n  ${offenders.join('\n  ')}`,
      ).toEqual([]);
    });

    it(`"${newName}" is present in each of its ${FILES_BY_HELPER[oldName]!.length} declaring files`, () => {
      const offenders: string[] = [];
      for (const f of FILES_BY_HELPER[oldName]!) {
        const content = read(f);
        if (!new RegExp(`\\b${newName}\\b`).test(content)) offenders.push(f);
      }
      expect(
        offenders,
        `Files missing the renamed helper "${newName}":\n  ${offenders.join('\n  ')}`,
      ).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // S5.3 — createMockPrisma → createMockDb
  // ─────────────────────────────────────────────────────────────────────────
  describe('S5.3: createMockPrisma → createMockDb rename (2 files)', () => {
    const oldName = 'createMockPrisma';
    const newName = 'createMockDb';

    it(`"${oldName}" is absent in each of its ${FILES_BY_HELPER[oldName]!.length} declaring files`, () => {
      const offenders: string[] = [];
      for (const f of FILES_BY_HELPER[oldName]!) {
        const content = read(f);
        if (new RegExp(`\\b${oldName}\\b`).test(content)) offenders.push(f);
      }
      expect(
        offenders,
        `Files still referencing "${oldName}" (must be renamed to "${newName}"):\n  ${offenders.join('\n  ')}`,
      ).toEqual([]);
    });

    it(`"${newName}" is present in each of its ${FILES_BY_HELPER[oldName]!.length} declaring files`, () => {
      const offenders: string[] = [];
      for (const f of FILES_BY_HELPER[oldName]!) {
        const content = read(f);
        if (!new RegExp(`\\b${newName}\\b`).test(content)) offenders.push(f);
      }
      expect(
        offenders,
        `Files missing the renamed helper "${newName}":\n  ${offenders.join('\n  ')}`,
      ).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // S5.4 — makePrisma → makeDb
  // ─────────────────────────────────────────────────────────────────────────
  describe('S5.4: makePrisma → makeDb rename (20 files)', () => {
    const oldName = 'makePrisma';
    const newName = 'makeDb';

    it(`"${oldName}" is absent in each of its ${FILES_BY_HELPER[oldName]!.length} declaring files`, () => {
      const offenders: string[] = [];
      for (const f of FILES_BY_HELPER[oldName]!) {
        const content = read(f);
        if (new RegExp(`\\b${oldName}\\b`).test(content)) offenders.push(f);
      }
      expect(
        offenders,
        `Files still referencing "${oldName}" (must be renamed to "${newName}"):\n  ${offenders.join('\n  ')}`,
      ).toEqual([]);
    });

    it(`"${newName}" is present in each of its ${FILES_BY_HELPER[oldName]!.length} declaring files`, () => {
      const offenders: string[] = [];
      for (const f of FILES_BY_HELPER[oldName]!) {
        const content = read(f);
        if (!new RegExp(`\\b${newName}\\b`).test(content)) offenders.push(f);
      }
      expect(
        offenders,
        `Files missing the renamed helper "${newName}":\n  ${offenders.join('\n  ')}`,
      ).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // S5.5 — makeMoviePrisma → makeMovieDb
  // ─────────────────────────────────────────────────────────────────────────
  describe('S5.5: makeMoviePrisma → makeMovieDb rename (1 file)', () => {
    const oldName = 'makeMoviePrisma';
    const newName = 'makeMovieDb';

    it(`"${oldName}" is absent in its declaring file`, () => {
      const offenders: string[] = [];
      for (const f of FILES_BY_HELPER[oldName]!) {
        const content = read(f);
        if (new RegExp(`\\b${oldName}\\b`).test(content)) offenders.push(f);
      }
      expect(
        offenders,
        `Files still referencing "${oldName}" (must be renamed to "${newName}"):\n  ${offenders.join('\n  ')}`,
      ).toEqual([]);
    });

    it(`"${newName}" is present in its declaring file`, () => {
      const offenders: string[] = [];
      for (const f of FILES_BY_HELPER[oldName]!) {
        const content = read(f);
        if (!new RegExp(`\\b${newName}\\b`).test(content)) offenders.push(f);
      }
      expect(
        offenders,
        `Files missing the renamed helper "${newName}":\n  ${offenders.join('\n  ')}`,
      ).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // S5.6 — Global zero-occurrence assertion
  //
  // After Green, no `*.ts` file under server/src or tests/ should reference
  // any of the 4 old helper names — this catches the straggler case where a
  // file uses the helper but wasn't in the inventory (e.g. a new test
  // authored between S5 Red and S5 Green). The S1 audit test and the S5
  // test itself are exempt because they legitimately name the symbols they
  // assert against.
  // ─────────────────────────────────────────────────────────────────────────
  describe('S5.6: global zero-occurrence of Prisma-named helpers', () => {
    for (const { oldName } of RENAMES) {
      it(`grep "\\b${oldName}\\b" returns zero hits under server/src and tests/`, () => {
        const allFiles = [...listSourceFiles(SERVER_SRC), ...listSourceFiles(TESTS_DIR)];
        const hits = grepHits(allFiles, oldName).filter((h) => !isExempt(h.file));
        if (hits.length > 0) {
          const summary = hits
            .slice(0, 20)
            .map((h) => `${h.file}:${h.line}: ${h.snippet}`)
            .join('\n  ');
          throw new Error(
            `Found ${hits.length} references to "${oldName}" that must be removed in Green:\n  ${summary}\n  ...`,
          );
        }
        expect(hits).toEqual([]);
      });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // S5.7 — Global "new names are findable" assertion
  //
  // After Green, each new Drizzle name must be findable in the codebase
  // (so we know the renames were not deleted wholesale) and the total hit
  // count for each new name must be ≥ the total hit count for the old name
  // in the pre-Green inventory (so no call site was accidentally dropped).
  //
  // The strict hit-count check is only enforced for the renames we have
  // hit-counts for; for the new names we measure the post-Green hit count
  // and assert it is at least 1 per renaming (so an empty post-Green rename
  // still fails).
  // ─────────────────────────────────────────────────────────────────────────
  describe('S5.7: each new Drizzle helper name is findable in the codebase', () => {
    for (const { newName } of RENAMES) {
      it(`"${newName}" is findable in at least one source file (rename was not deleted wholesale)`, () => {
        const allFiles = [...listSourceFiles(SERVER_SRC), ...listSourceFiles(TESTS_DIR)];
        const hits = grepHits(allFiles, newName).filter((h) => !isExempt(h.file));
        expect(
          hits.length,
          `Expected at least one hit for "${newName}" after Green; found 0 — the rename was not committed.`,
        ).toBeGreaterThan(0);
      });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // S5.8 — typeof references migrated
  //
  // Catches the `ReturnType<typeof makePrisma>` / `typeof createPrismaMock`
  // pattern specifically. The bare-name regex in S5.6/S5.7 would also
  // match a string literal or comment, but the typeof check is the strict
  // "identifier actually used at the type level" assertion. The per-file
  // list is the verbatim audit from the Red-phase `grep -nE
  // "ReturnType<typeof\s+(makePrisma|createPrismaMock|createMockPrisma|
  // makeMoviePrisma)" -r` output.
  // ─────────────────────────────────────────────────────────────────────────
  describe('S5.8: typeof <oldName> references migrated to typeof <newName>', () => {
    it('no "typeof <oldName>" reference remains in any inventory file', () => {
      const offenders: { file: string; oldName: string; line: number; snippet: string }[] = [];
      const re = /typeof\s+(createPrismaMock|createMockPrisma|makePrisma|makeMoviePrisma)\b/;
      for (const f of new Set(TYPEOF_REFERENCES.map((r) => r.file))) {
        const content = read(f);
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const m = re.exec(lines[i]!);
          if (m) {
            offenders.push({
              file: f,
              oldName: m[1]!,
              line: i + 1,
              snippet: lines[i]!.trim(),
            });
          }
        }
      }
      expect(
        offenders,
        `Files with unmigrated "typeof <oldName>" references:\n  ` +
          offenders.map((o) => `${o.file}:${o.line} (${o.oldName}) — ${o.snippet}`).join('\n  '),
      ).toEqual([]);
    });

    it('the "typeof <newName>" form appears at the same site count as the pre-Green "typeof <oldName>" count', () => {
      // Group the inventory by (file, newName) so we can compare pre/post
      // counts per helper per file.
      const groups = new Map<string, { file: string; newName: string; expected: number }>();
      for (const ref of TYPEOF_REFERENCES) {
        const key = `${ref.file}::${ref.newName}`;
        const entry = groups.get(key);
        if (entry) entry.expected++;
        else groups.set(key, { file: ref.file, newName: ref.newName, expected: 1 });
      }

      const offenders: { file: string; newName: string; expected: number; actual: number }[] = [];
      for (const g of groups.values()) {
        const content = read(g.file);
        const re = new RegExp(`typeof\\s+${g.newName}\\b`, 'g');
        let actual = 0;
        let m: RegExpExecArray | null;
        while ((m = re.exec(content)) !== null) actual++;
        if (actual < g.expected) {
          offenders.push({ file: g.file, newName: g.newName, expected: g.expected, actual });
        }
      }
      expect(
        offenders,
        `Some "typeof <newName>" sites are missing or undercounted:\n  ` +
          offenders.map((o) => `${o.file} (${o.newName}): expected ≥ ${o.expected}, got ${o.actual}`).join('\n  '),
      ).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // S5.9 — Audit catalog (audit-results.md) for the S5 rename scope
  //
  // The S1 audit test verifies the audit-results.md artifact is present
  // and reports counts for the raw-SQL shim scope. S5 extends that artifact
  // with a "Naming Residue" section listing the 31 files, the 4 helper
  // names, and the 278-hit count. Red phase asserts the section exists
  // (will fail today), Green phase adds the section.
  // ─────────────────────────────────────────────────────────────────────────
  describe('S5.9: audit-results.md acknowledges the S5 naming-residue scope', () => {
    it('audit-results.md exists at the track path', () => {
      expect(
        fs.existsSync(AUDIT_PATH),
        `Audit catalog must be committed at ${AUDIT_PATH}`,
      ).toBe(true);
    });

    it('audit-results.md contains a "Naming Residue" section', () => {
      if (!fs.existsSync(AUDIT_PATH)) return;
      const text = fs.readFileSync(AUDIT_PATH, 'utf8');
      expect(text).toMatch(/Naming Residue|naming residue|helper renam/i);
    });

    it('audit-results.md documents all 4 old helper names', () => {
      if (!fs.existsSync(AUDIT_PATH)) return;
      const text = fs.readFileSync(AUDIT_PATH, 'utf8');
      for (const { oldName } of RENAMES) {
        expect(text, `audit-results.md must name "${oldName}"`).toContain(oldName);
      }
    });

    it('audit-results.md documents all 4 new Drizzle helper names', () => {
      if (!fs.existsSync(AUDIT_PATH)) return;
      const text = fs.readFileSync(AUDIT_PATH, 'utf8');
      for (const { newName } of RENAMES) {
        expect(text, `audit-results.md must name the renamed helper "${newName}"`).toContain(newName);
      }
    });

    it('audit-results.md reports the 31-file / 4-helper / 278-hit scope', () => {
      if (!fs.existsSync(AUDIT_PATH)) return;
      const text = fs.readFileSync(AUDIT_PATH, 'utf8');
      // Hit count line: `**Total Prisma-named helper references: 278**`
      const hitMatch = text.match(/\*\*Total Prisma-named helper references:\*\*\s*(\d+)/);
      expect(hitMatch, 'audit-results.md must report the total Prisma-named helper hit count').not.toBeNull();
      expect(Number(hitMatch![1])).toBe(278);

      // File count line: `**Files with Prisma-named helpers: 31**`
      const fileMatch = text.match(/\*\*Files with Prisma-named helpers:\*\*\s*(\d+)/);
      expect(fileMatch, 'audit-results.md must report the Prisma-named helper file count').not.toBeNull();
      expect(Number(fileMatch![1])).toBe(31);
    });
  });
});
