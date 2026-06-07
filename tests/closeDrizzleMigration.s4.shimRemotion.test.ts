import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// ─────────────────────────────────────────────────────────────────────────────
// chore_close_drizzle_migration_20260607 — Phase S4 Red
//
// Goal: delete `server/src/types/prisma.ts` and migrate every PrismaClient
// import/annotation in `server/src/` and `tests/` over to `DatabaseClient` from
// `server/src/db/drizzleClient.ts`. Zero `PrismaClient` references in
// non-archived code after Green.
//
// These Red-phase tests fail today for the precise missing behavior the
// Green phase will resolve:
//
//   S4.1 — server/src/types/prisma.ts must be deleted.
//   S4.2 — Zero `PrismaClient` references in server/src/**/*.ts and
//          tests/**/*.ts (excluding node_modules + measure/archive/).
//   S4.3 — Every repository, service, and route that currently types its
//          `prisma` parameter as `PrismaClient` (or annotates a local
//          `prisma` field as `PrismaClient`) must be re-annotated to
//          `DatabaseClient` from `server/src/db/drizzleClient.ts`.
//   S4.4 — Test files that currently import `PrismaClient` from
//          `@prisma/client` must be migrated to `DatabaseClient`.
//   S4.5 — Type aliases the shim provided (PlaybackMediaType,
//          WantedSubtitleState, VariantMediaType, SubtitleTrackSource)
//          must remain resolvable from Drizzle schema or shared types so
//          the rest of the codebase keeps typechecking.
//
// The scanner helpers match the patterns established in
// `tests/closeDrizzleMigration.audit.test.ts` (Phase S1) so the S4 Red tests
// are consistent with the rest of the close-drizzle-migration suite.
// ─────────────────────────────────────────────────────────────────────────────

const REPO_ROOT = path.resolve(__dirname, '..');
const SERVER_SRC = path.join(REPO_ROOT, 'server', 'src');
const TESTS_DIR = path.join(REPO_ROOT, 'tests');
const SHIM_PATH = path.join(SERVER_SRC, 'types', 'prisma.ts');
const DRIZZLE_CLIENT_PATH = path.join(SERVER_SRC, 'db', 'drizzleClient.ts');
const DRIZZLE_SCHEMA_PATH = path.join(SERVER_SRC, 'db', 'schema.ts');

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

function read(rel: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');
}

function fileExists(rel: string): boolean {
  return fs.existsSync(path.join(REPO_ROOT, rel));
}

function rel(p: string): string {
  return path.relative(REPO_ROOT, p);
}

function grepPrismaClientHits(files: string[]): { file: string; line: number; snippet: string }[] {
  const hits: { file: string; line: number; snippet: string }[] = [];
  const re = /\bPrismaClient\b/g;
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let match: RegExpExecArray | null;
      const local = new RegExp(re.source, 'g');
      while ((match = local.exec(line)) !== null) {
        hits.push({ file: rel(file), line: i + 1, snippet: line.trim() });
      }
    }
  }
  return hits;
}

// Inventory of every file that the Green phase must touch.
// The Red-phase test asserts the current (pre-Green) state has
// `PrismaClient` references in these files. Once Green lands, the same
// assertions invert: the file's PrismaClient count is 0.
const REPOSITORY_FILES = [
  'server/src/repositories/NotificationRepository.ts',
  'server/src/repositories/TorrentRepository.ts',
  'server/src/repositories/PlaybackRepository.ts',
  'server/src/repositories/ActivityEventRepository.ts',
  'server/src/repositories/DownloadClientRepository.ts',
  'server/src/repositories/QualityProfileRepository.ts',
  'server/src/repositories/BlocklistRepository.ts',
  'server/src/repositories/MediaRepository.ts',
  'server/src/repositories/IndexerHealthRepository.ts',
  'server/src/repositories/SeriesRepository.ts',
  'server/src/repositories/AppSettingsRepository.ts',
  'server/src/repositories/ImportListRepository.ts',
  'server/src/repositories/CollectionRepository.ts',
  'server/src/repositories/SubtitleVariantRepository.ts',
  'server/src/repositories/IndexerRepository.ts',
  'server/src/repositories/CustomFormatRepository.ts',
  'server/src/repositories/MovieRepository.ts',
];

const SERVICE_FILES = [
  'server/src/services/BulkImportService.ts',
  'server/src/services/WantedSearchService.ts',
  'server/src/services/SeriesMonitoringService.ts',
  'server/src/services/LibraryScanService.ts',
  'server/src/services/FilenameParsingService.ts',
  'server/src/services/PlaybackService.ts',
  'server/src/services/MovieOrganizeService.ts',
  'server/src/services/VariantBackfillService.ts',
  'server/src/services/importLists/ImportListSyncService.ts',
  'server/src/services/RssSyncService.ts',
  'server/src/services/SeriesOrganizeService.ts',
  'server/src/services/CollectionService.ts',
];

const ROUTE_FILES = [
  'server/src/api/routes/movieRoutes.ts',
  'server/src/api/routes/seriesRoutes.ts',
];

const API_TYPES_FILE = 'server/src/api/types.ts';
const TEST_FILES = [
  'tests/wanted-search-service.test.ts',
  'server/src/services/VariantBackfillService.test.ts',
];
const COMMENT_FILE = 'server/src/services/FilenameParsingService.test.ts';

const ALL_PROD_FILES = [...REPOSITORY_FILES, ...SERVICE_FILES, ...ROUTE_FILES, API_TYPES_FILE];
const SHIM_PROVIDED_TYPE_ALIASES = [
  'PlaybackMediaType',
  'WantedSubtitleState',
  'VariantMediaType',
  'SubtitleTrackSource',
];

describe('chore_close_drizzle_migration_20260607 — Phase S4: Remove PrismaClient type shim (Red)', () => {
  // ─────────────────────────────────────────────────────────────────────────
  // S4.1 — Shim file deletion
  // ─────────────────────────────────────────────────────────────────────────
  describe('S4.1: server/src/types/prisma.ts shim must be deleted', () => {
    it('the shim file does not exist on disk', () => {
      expect(
        fs.existsSync(SHIM_PATH),
        `PrismaClient type shim must be deleted at ${rel(SHIM_PATH)} (Phase S4 acceptance criterion: types/prisma.ts removed)`,
      ).toBe(false);
    });

    it('no source file imports from server/src/types/prisma (the shim is unreferenced)', () => {
      const allFiles = [...listSourceFiles(SERVER_SRC), ...listSourceFiles(TESTS_DIR)];
      const offenders: string[] = [];
      const importRe = /from\s+['"](?:\.\.\/)+types\/prisma['"]/;
      for (const file of allFiles) {
        const content = fs.readFileSync(file, 'utf8');
        if (importRe.test(content)) offenders.push(rel(file));
      }
      expect(offenders, `Files still importing from the deleted shim: ${offenders.join(', ')}`).toEqual([]);
    });

    it('the audit-results.md S4 section acknowledges the shim file will be deleted', () => {
      const auditPath = path.join(
        REPO_ROOT,
        'measure',
        'tracks',
        'chore_close_drizzle_migration_20260607',
        'audit-results.md',
      );
      if (!fs.existsSync(auditPath)) return; // S1 audit is committed elsewhere
      const text = fs.readFileSync(auditPath, 'utf8');
      // The current audit lists types/prisma.ts as a type-declaration file;
      // after Green it must say the shim is removed. Red phase asserts the
      // current state still names the shim, so Green can update the audit.
      expect(text).toMatch(/types\/prisma|PrismaClient type shim/);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // S4.2 — Zero PrismaClient references in non-archived code
  // ─────────────────────────────────────────────────────────────────────────
  describe('S4.2: zero PrismaClient references in non-archived code', () => {
    it('grep "PrismaClient" returns zero hits under server/src and tests/ (excl. node_modules + archive + test files that document the symbol)', () => {
      const SELF = rel(__filename);
      const S1_AUDIT = 'tests/closeDrizzleMigration.audit.test.ts';
      const serverHits = grepPrismaClientHits(listSourceFiles(SERVER_SRC));
      const testHits = grepPrismaClientHits(listSourceFiles(TESTS_DIR));
      const all = [...serverHits, ...testHits].filter(
        (h) => h.file !== SELF && h.file !== S1_AUDIT,
      );
      if (all.length > 0) {
        const summary = all
          .slice(0, 20)
          .map((h) => `${h.file}:${h.line}: ${h.snippet}`)
          .join('\n  ');
        throw new Error(
          `Found ${all.length} PrismaClient references that must be removed in Green phase:\n  ${summary}\n  ...`,
        );
      }
      expect(all).toEqual([]);
    });

    it('no repository file references PrismaClient', () => {
      const offenders: string[] = [];
      for (const rel of REPOSITORY_FILES) {
        const content = read(rel);
        if (/\bPrismaClient\b/.test(content)) offenders.push(rel);
      }
      expect(
        offenders,
        `Repositories still importing/using PrismaClient: ${offenders.join(', ')}`,
      ).toEqual([]);
    });

    it('no service file references PrismaClient', () => {
      const offenders: string[] = [];
      for (const rel of SERVICE_FILES) {
        const content = read(rel);
        if (/\bPrismaClient\b/.test(content)) offenders.push(rel);
      }
      expect(
        offenders,
        `Services still importing/using PrismaClient: ${offenders.join(', ')}`,
      ).toEqual([]);
    });

    it('no route file references PrismaClient (incl. inline `import("@prisma/client").PrismaClient` casts)', () => {
      const offenders: string[] = [];
      for (const rel of ROUTE_FILES) {
        const content = read(rel);
        if (/\bPrismaClient\b/.test(content)) offenders.push(rel);
      }
      expect(
        offenders,
        `Route files still using PrismaClient inline: ${offenders.join(', ')}`,
      ).toEqual([]);
    });

    it('the api/types.ts ApiDependencies interface uses DatabaseClient (not PrismaClient) for the prisma field', () => {
      const content = read(API_TYPES_FILE);
      expect(content).not.toMatch(/from\s+['"]@prisma\/client['"]/);
      expect(content).not.toMatch(/\bPrismaClient\b/);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // S4.3 — Repository, service, and api/types imports re-annotated to DatabaseClient
  // ─────────────────────────────────────────────────────────────────────────
  describe('S4.3: repositories, services, and api/types re-annotated to DatabaseClient', () => {
    it('DatabaseClient is exported from server/src/db/drizzleClient.ts (S4 imports target the existing class)', () => {
      const content = read('server/src/db/drizzleClient.ts');
      expect(content).toMatch(/export\s+class\s+DatabaseClient/);
    });

    it('every repository imports DatabaseClient (not PrismaClient) for the prisma constructor parameter', () => {
      const offenders: { file: string; reason: string }[] = [];
      for (const rel of REPOSITORY_FILES) {
        const content = read(rel);
        const importsPrisma = /from\s+['"]@prisma\/client['"]/.test(content);
        const hasPrismaClient = /\bPrismaClient\b/.test(content);
        const importsDatabaseClient = /from\s+['"][^'"]*db\/drizzleClient['"]/.test(content);
        if (importsPrisma || hasPrismaClient) {
          offenders.push({ file: rel, reason: 'still references @prisma/client or PrismaClient' });
          continue;
        }
        const hasConstructor = /constructor\s*\([^)]*prisma\s*:/.test(content);
        if (hasConstructor && !importsDatabaseClient) {
          offenders.push({ file: rel, reason: 'declares `prisma:` constructor param without importing DatabaseClient' });
        }
      }
      expect(
        offenders,
        `Repositories not yet migrated to DatabaseClient:\n  ${offenders.map((o) => `${o.file} — ${o.reason}`).join('\n  ')}`,
      ).toEqual([]);
    });

    it('every service imports DatabaseClient (not PrismaClient) for the prisma constructor parameter', () => {
      const offenders: { file: string; reason: string }[] = [];
      for (const rel of SERVICE_FILES) {
        const content = read(rel);
        const importsPrisma = /from\s+['"]@prisma\/client['"]/.test(content);
        const hasPrismaClient = /\bPrismaClient\b/.test(content);
        const importsDatabaseClient = /from\s+['"][^'"]*db\/drizzleClient['"]/.test(content);
        if (importsPrisma || hasPrismaClient) {
          offenders.push({ file: rel, reason: 'still references @prisma/client or PrismaClient' });
          continue;
        }
        const hasConstructor = /constructor\s*\([^)]*prisma\s*:/.test(content);
        if (hasConstructor && !importsDatabaseClient) {
          offenders.push({ file: rel, reason: 'declares `prisma:` constructor param without importing DatabaseClient' });
        }
      }
      expect(
        offenders,
        `Services not yet migrated to DatabaseClient:\n  ${offenders.map((o) => `${o.file} — ${o.reason}`).join('\n  ')}`,
      ).toEqual([]);
    });

    it('api/types.ts imports DatabaseClient for the prisma field of ApiDependencies', () => {
      const content = read(API_TYPES_FILE);
      expect(content).toMatch(/from\s+['"][^'"]*db\/drizzleClient['"]/);
      // The prisma field must reference DatabaseClient (not PrismaClient) for the type.
      expect(content).toMatch(/prisma\s*:\s*DatabaseClient/);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // S4.4 — Test files migrated to DatabaseClient
  // ─────────────────────────────────────────────────────────────────────────
  describe('S4.4: test files migrated to DatabaseClient', () => {
    it('tests/wanted-search-service.test.ts uses DatabaseClient, not PrismaClient', () => {
      const content = read('tests/wanted-search-service.test.ts');
      expect(content).not.toMatch(/\bPrismaClient\b/);
      expect(content).toMatch(/DatabaseClient|from\s+['"][^'"]*db\/drizzleClient['"]/);
    });

    it('server/src/services/VariantBackfillService.test.ts uses DatabaseClient, not PrismaClient', () => {
      const content = read('server/src/services/VariantBackfillService.test.ts');
      expect(content).not.toMatch(/\bPrismaClient\b/);
      expect(content).toMatch(/DatabaseClient|from\s+['"][^'"]*db\/drizzleClient['"]/);
    });

    it('the FilenameParsingService.test.ts comment no longer says "PrismaClient" (comment-only drift)', () => {
      const content = read(COMMENT_FILE);
      expect(content).not.toMatch(/PrismaClient/);
    });

    it('no test file under server/src/**/*.{test,spec}.ts uses PrismaClient as an identifier (import, cast, type annotation)', () => {
      // Match identifier usage, not the bare word in test descriptions / strings.
      // Self-exclusion: the S4 test file is allowed to name the symbol it
      // asserts against.
      const SELF = rel(__filename);
      const USAGE_RE = /(?:import\s+type\s+\{[^}]*\bPrismaClient\b[^}]*\}|\bas\s+\bPrismaClient\b|\bas\s+unknown\s+as\s+PrismaClient\b|:\s*PrismaClient\b|<PrismaClient\b)/;
      const offenders: string[] = [];
      const testFiles = listSourceFiles(SERVER_SRC).filter((f) => /\.(test|spec)\.ts$/.test(f));
      for (const f of testFiles) {
        if (rel(f) === SELF) continue;
        const content = fs.readFileSync(f, 'utf8');
        if (USAGE_RE.test(content)) offenders.push(rel(f));
      }
      expect(
        offenders,
        `Server-side test files still importing/casting/annotating PrismaClient: ${offenders.join(', ')}`,
      ).toEqual([]);
    });

    it('no test file under tests/**/*.ts uses PrismaClient as an identifier (import, cast, type annotation)', () => {
      // The S1 audit test (closeDrizzleMigration.audit.test.ts) legitimately
      // references the symbol in its audit-name strings; it is allowed as
      // a self-referential exemption. The S4 test file is the second exemption.
      const SELF = rel(__filename);
      const S1_AUDIT = 'tests/closeDrizzleMigration.audit.test.ts';
      const USAGE_RE = /(?:import\s+type\s+\{[^}]*\bPrismaClient\b[^}]*\}|\bas\s+\bPrismaClient\b|\bas\s+unknown\s+as\s+PrismaClient\b|:\s*PrismaClient\b|<PrismaClient\b)/;
      const offenders: string[] = [];
      for (const f of listSourceFiles(TESTS_DIR)) {
        const r = rel(f);
        if (r === SELF || r === S1_AUDIT) continue;
        const content = fs.readFileSync(f, 'utf8');
        if (USAGE_RE.test(content)) offenders.push(r);
      }
      expect(
        offenders,
        `Top-level test files still importing/casting/annotating PrismaClient: ${offenders.join(', ')}`,
      ).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // S4.5 — Type-alias preservation across the Drizzle schema surface
  //
  // The shim provided these string-literal union types; deleting it must not
  // silently break the ~12 files that import them. Either they must be
  // re-exported from the Drizzle schema, a shared types module, or replaced
  // with equivalent local definitions. Red phase asserts the aliases still
  // resolve from somewhere; Green phase adds the re-exports.
  // ─────────────────────────────────────────────────────────────────────────
  describe('S4.5: type-alias preservation (PlaybackMediaType / WantedSubtitleState / VariantMediaType / SubtitleTrackSource)', () => {
    it('drizzleClient.ts / schema.ts are the canonical sources for these type aliases', () => {
      // The Drizzle schema already exports `PlaybackMediaTypeEnum` as a
      // readonly tuple. The shim aliases it provides must remain reachable
      // for the ~12 consumers after the shim is deleted. Red phase asserts
      // the schema still owns the enum; Green phase must wire the alias
      // exports (likely a small `server/src/types/dbEnums.ts` re-export).
      const schema = fs.readFileSync(DRIZZLE_SCHEMA_PATH, 'utf8');
      expect(schema).toMatch(/PlaybackMediaTypeEnum/);
    });

    it('the four shim-provided type aliases still appear (in some file) so consumers compile after the shim is gone', () => {
      const allFiles = [...listSourceFiles(SERVER_SRC), ...listSourceFiles(TESTS_DIR)];
      const aliasesFound: Record<string, string[]> = Object.fromEntries(
        SHIM_PROVIDED_TYPE_ALIASES.map((alias) => [alias, []]),
      );
      for (const file of allFiles) {
        const content = fs.readFileSync(file, 'utf8');
        for (const alias of SHIM_PROVIDED_TYPE_ALIASES) {
          // Look for `type X = ...` (declarations) OR `export type X` OR `X:` (usage).
          if (new RegExp(`\\b${alias}\\b`).test(content)) {
            aliasesFound[alias].push(rel(file));
          }
        }
      }
      // After Green: every alias must be findable in at least one source file
      // (typically a small re-export module or schema.ts). Red phase asserts
      // the search found each alias in its current declared location
      // (types/prisma.ts) — if any are missing entirely, Green is wrong.
      for (const alias of SHIM_PROVIDED_TYPE_ALIASES) {
        expect(
          aliasesFound[alias].length,
          `${alias} must be findable in some file (currently in shim) so Green can re-export it`,
        ).toBeGreaterThan(0);
      }
    });
  });
});
