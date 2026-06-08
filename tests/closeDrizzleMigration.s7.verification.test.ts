import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// ─────────────────────────────────────────────────────────────────────────────
// chore_close_drizzle_migration_20260607 — Phase S7 Red
//
// Goal: verify the post-Green closeout state for the track. S7 is the
// final phase — the deliverable IS the closeout (plan/tech-debt/lessons-
// learned/archived-state/tracks.md + the zero-residue grep). Red-phase
// tests assert the post-Green state and fail today because the closeout
// has not happened yet.
//
// Red-phase shape (failing for the expected missing behavior):
//
//   S7.1 — Plan closeout: every S7 task in plan.md is marked `[x]` and
//          carries a commit SHA. FAILS today (tasks are `[~]` mid-Red).
//   S7.2 — Tech-debt closeout: 3 specific rows in `measure/tech-debt.md`
//          are marked `Resolved` (the `$executeRawUnsafe` shim row, the
//          combined PrismaClient-type-shim/createPrismaMock-naming-residue
//          row, and the OPENAI_API_KEY row). FAILS today: the shim row
//          and the combined type-shim/naming-residue row are still
//          `Open`.
//   S7.3 — Lessons-learned closeout: `measure/lessons-learned.md` has a
//          dated entry that captures the Drizzle mock-naming convention.
//          FAILS today (no such entry exists — the file's last entry is
//          dated 2026-05-26).
//   S7.4 — Archive move: the track directory has been moved from
//          `measure/tracks/chore_close_drizzle_migration_20260607/` to
//          `measure/archive/chore_close_drizzle_migration_20260607/`.
//          FAILS today (still under `tracks/`).
//   S7.5 — tracks.md closeout: the active-tracks entry for this track
//          has been removed (or moved to the archived section). FAILS
//          today (still present in the active list).
//   S7.6 — Grep verification: zero `\b<raw|client|helper>\b` hits for
//          `$executeRawUnsafe` / `$queryRawUnsafe` / `PrismaClient` /
//          `createPrismaMock` / `createMockPrisma` / `makePrisma` /
//          `makeMoviePrisma` in non-archived code. FAILS today with the
//          hits enumerated in the plan.md live-gate note.
//   S7.7 — Test file self-consistency: vacuous-pass guard.
//
// The S7 test uses the same `REPO_ROOT` + filesystem scanner helpers
// established in `tests/closeDrizzleMigration.audit.test.ts` (S1) and
// the per-phase shim/naming suites (S4/S5/S6) so the close-drizzle-
// migration suite stays consistent.
// ─────────────────────────────────────────────────────────────────────────────

const REPO_ROOT = path.resolve(__dirname, '..');
const SERVER_SRC = path.join(REPO_ROOT, 'server', 'src');
const SERVER_TESTS = path.join(REPO_ROOT, 'server', 'src');
const TESTS_DIR = path.join(REPO_ROOT, 'tests');
const APP_DIR = path.join(REPO_ROOT, 'app');
const MEASURE_DIR = path.join(REPO_ROOT, 'measure');
const ARCHIVE_DIR = path.join(MEASURE_DIR, 'archive');
const TRACKS_REGISTRY = path.join(MEASURE_DIR, 'tracks.md');
const TECH_DEBT_PATH = path.join(MEASURE_DIR, 'tech-debt.md');
const LESSONS_LEARNED_PATH = path.join(MEASURE_DIR, 'lessons-learned.md');

const TRACK_ID = 'chore_close_drizzle_migration_20260607';
const TRACK_DIR_TRACKS = path.join(MEASURE_DIR, 'tracks', TRACK_ID);
const TRACK_DIR_ARCHIVE = path.join(ARCHIVE_DIR, TRACK_ID);

const S7_PLAN_PATH = path.join(
  ARCHIVE_DIR,
  TRACK_ID,
  'plan.md',
);
const S7_AUDIT_PATH = path.join(
  ARCHIVE_DIR,
  TRACK_ID,
  'audit-results.md',
);

const SELF = path.relative(REPO_ROOT, __filename);

function read(rel: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');
}

function fileExists(rel: string): boolean {
  return fs.existsSync(path.join(REPO_ROOT, rel));
}

function listSourceFiles(root: string, opts: { excludeSelf?: boolean } = {}): string[] {
  if (!fs.existsSync(root)) return [];
  const out: string[] = [];
  const stack: string[] = [root];
  while (stack.length > 0) {
    const current = stack.pop()!;
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (
          entry.name === 'node_modules' ||
          entry.name === 'dist' ||
          entry.name === '__tests__' ||
          entry.name.startsWith('.')
        )
          continue;
        stack.push(full);
      } else if (entry.isFile() && /\.[jt]sx?$/.test(entry.name)) {
        out.push(full);
      }
    }
  }
  return out.sort().filter((f) => {
    if (!opts.excludeSelf) return true;
    return path.relative(REPO_ROOT, f) !== SELF;
  });
}

const S7_HEADING_REGEX = /^##\s+Phase\s+S7:\s+Verification,\s+debt\s+closeout\s+&\s+handoff\s*$/m;
const S7_NEXT_HEADING_REGEX = /^##\s+/m;

function s7Section(plan: string): string {
  const heading = plan.match(S7_HEADING_REGEX);
  if (!heading || heading.index === undefined) return '';
  const start = heading.index + heading[0].length;
  const tail = plan.slice(start);
  const next = tail.match(S7_NEXT_HEADING_REGEX);
  const end = next && next.index !== undefined ? start + next.index : plan.length;
  return plan.slice(start, end);
}

interface TechDebtRow {
  date: string;
  track: string;
  item: string;
  severity: string;
  status: string;
  notes: string;
}

function findTechDebtRows(debt: string): TechDebtRow[] {
  const rows = debt.split('\n').filter((line) => line.trim().startsWith('|'));
  const out: TechDebtRow[] = [];
  for (const row of rows) {
    const cells = row.split('|').map((c) => c.trim());
    const body = cells.slice(1, -1);
    if (body.length < 6) continue;
    out.push({
      date: body[0] ?? '',
      track: body[1] ?? '',
      item: body[2] ?? '',
      severity: body[3] ?? '',
      status: body[4] ?? '',
      notes: body[5] ?? '',
    });
  }
  return out;
}

// Patterns that the S7 closeout grep asserts are absent. Each pattern is
// a word-boundary regex — substring matches like `makePrismaMock` do not
// fail the suite (they are different local helpers, not the renamed
// `makePrisma` / `createPrismaMock` Prisma-named helpers).
const RESIDUE_PATTERNS: RegExp[] = [
  /\$executeRawUnsafe\b/,
  /\$queryRawUnsafe\b/,
  /\bPrismaClient\b/,
  /\bcreatePrismaMock\b/,
  /\bcreateMockPrisma\b/,
  /\bmakePrisma\b/,
  /\bmakeMoviePrisma\b/,
];

function grepResidueHits(roots: string[]): { file: string; line: number; pattern: string; snippet: string }[] {
  const hits: { file: string; line: number; pattern: string; snippet: string }[] = [];
  for (const root of roots) {
    for (const file of listSourceFiles(root)) {
      const rel = path.relative(REPO_ROOT, file);
      if (rel === SELF) continue;
      // Skip the S7 test file itself (it intentionally references the
      // patterns in comments + regex literals). All other close-drizzle-
      // migration test files are in scope — they would be the source of
      // a regression if the S5 / S6 work is undone.
      if (rel === 'tests/closeDrizzleMigration.s7.verification.test.ts') continue;
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (const re of RESIDUE_PATTERNS) {
          if (re.test(line)) {
            hits.push({
              file: rel,
              line: i + 1,
              pattern: re.source,
              snippet: line.trim().slice(0, 160),
            });
          }
        }
      }
    }
  }
  return hits;
}

describe('chore_close_drizzle_migration_20260607 — Phase S7: Verification, debt closeout & handoff (Red)', () => {
  // ─────────────────────────────────────────────────────────────────────────
  // S7.1 — Plan closeout: every S7 checkbox is marked `[x]`.
  // ─────────────────────────────────────────────────────────────────────────
  describe('S7.1: plan.md S7 closeout (all S7 tasks marked [x])', () => {
    it('plan.md contains the S7 phase heading', () => {
      expect(
        fileExists(path.relative(REPO_ROOT, S7_PLAN_PATH)),
        `plan.md must exist at ${S7_PLAN_PATH}`,
      ).toBe(true);
      const plan = read(path.relative(REPO_ROOT, S7_PLAN_PATH));
      expect(
        S7_HEADING_REGEX.test(plan),
        `plan.md must contain the S7 phase heading:\n  ## Phase S7: Verification, debt closeout & handoff`,
      ).toBe(true);
    });

    it('every S7 checkbox in plan.md is marked `[x]` (closeout complete)', () => {
      const plan = read(path.relative(REPO_ROOT, S7_PLAN_PATH));
      const section = s7Section(plan);
      expect(section, 'S7 section not found in plan.md').not.toBe('');
      const checkboxLines = section
        .split('\n')
        .filter((line) => /^\s*-\s+\[[ x~]\]/i.test(line));
      expect(
        checkboxLines.length,
        `S7 section must contain at least one checkbox (got ${checkboxLines.length})`,
      ).toBeGreaterThan(0);
      const open = checkboxLines.filter((line) => !/^\s*-\s+\[x\]/i.test(line));
      expect(
        open,
        `S7 checkboxes still open (Green phase must flip them to [x]):\n  ` +
          open.join('\n  '),
      ).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // S7.2 — Tech-debt closeout: the 3 rows in scope are `Resolved`.
  //
  // The S7 plan asks for 4 items to be marked Resolved, but they map to
  // 3 unique tech-debt rows:
  //   (a) `$executeRawUnsafe` shim → row that mentions `executeRawUnsafe`
  //   (b) `PrismaClient` type shim + `createPrismaMock` naming residue
  //       → combined row that mentions BOTH `PrismaClient` and
  //       `createPrismaMock`
  //   (c) Stale `OPENAI_API_KEY` → row whose Item column starts with
  //       `Old \`OPENAI_API_KEY\``
  // ─────────────────────────────────────────────────────────────────────────
  describe('S7.2: tech-debt.md closeout (3 residue rows marked Resolved)', () => {
    function findRowByItemMatch(predicate: (item: string) => boolean): TechDebtRow | null {
      const debt = read('measure/tech-debt.md');
      const rows = findTechDebtRows(debt);
      return rows.find((r) => predicate(r.item)) ?? null;
    }

    it('the `$executeRawUnsafe` shim row exists', () => {
      const row = findRowByItemMatch((item) => /executeRawUnsafe/.test(item));
      expect(
        row,
        `tech-debt.md must contain a row whose Item column references ` +
          `\`$executeRawUnsafe\` (the shim row from review_20260413).`,
      ).not.toBeNull();
    });

    it('the `$executeRawUnsafe` shim row is marked `Resolved`', () => {
      const row = findRowByItemMatch((item) => /executeRawUnsafe/.test(item));
      expect(row, 'shim row not found — see precondition').not.toBeNull();
      const status = row!.status;
      expect(
        status,
        `tech-debt.md \`$executeRawUnsafe\` shim row Status must be ` +
          `\`Resolved\` (got \`${status}\`). Green phase: flip Status to ` +
          `\`Resolved\` and append a closure note pointing at this track.`,
      ).toBe('Resolved');
    });

    it('the combined PrismaClient-type-shim / createPrismaMock-naming-residue row exists', () => {
      const row = findRowByItemMatch(
        (item) => /PrismaClient/i.test(item) && /createPrismaMock/.test(item),
      );
      expect(
        row,
        `tech-debt.md must contain a combined row whose Item column ` +
          `references BOTH \`PrismaClient\` (type shim) and \`createPrismaMock\` ` +
          `(naming residue).`,
      ).not.toBeNull();
    });

    it('the combined PrismaClient / createPrismaMock row is marked `Resolved`', () => {
      const row = findRowByItemMatch(
        (item) => /PrismaClient/i.test(item) && /createPrismaMock/.test(item),
      );
      expect(row, 'combined row not found — see precondition').not.toBeNull();
      const status = row!.status;
      expect(
        status,
        `tech-debt.md combined \`PrismaClient\` + \`createPrismaMock\` row ` +
          `Status must be \`Resolved\` (got \`${status}\`). Green phase: flip ` +
          `Status to \`Resolved\` and append a closure note.`,
      ).toBe('Resolved');
    });

    it('the stale `OPENAI_API_KEY` row exists', () => {
      const row = findRowByItemMatch((item) =>
        /Old\s+`OPENAI_API_KEY`/i.test(item),
      );
      expect(
        row,
        `tech-debt.md must contain a row whose Item column starts with ` +
          `\`Old \\\`OPENAI_API_KEY\\\`\`.`,
      ).not.toBeNull();
    });

    it('the stale `OPENAI_API_KEY` row is marked `Resolved`', () => {
      const row = findRowByItemMatch((item) =>
        /Old\s+`OPENAI_API_KEY`/i.test(item),
      );
      expect(row, 'OPENAI_API_KEY row not found — see precondition').not.toBeNull();
      const status = row!.status;
      expect(
        status,
        `tech-debt.md \`OPENAI_API_KEY\` row Status must be \`Resolved\` ` +
          `(got \`${status}\`). This was flipped in the S6 Green phase ` +
          `(\`b0ab909\`) — the test guards against regression.`,
      ).toBe('Resolved');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // S7.3 — Lessons-learned closeout: a dated entry capturing the Drizzle
  // mock-naming convention has been added.
  // ─────────────────────────────────────────────────────────────────────────
  describe('S7.3: lessons-learned.md closeout (Drizzle mock-naming convention entry)', () => {
    it('lessons-learned.md exists at the canonical path', () => {
      expect(
        fileExists('measure/lessons-learned.md'),
        `lessons-learned.md must exist at the measure/ root.`,
      ).toBe(true);
    });

    it('lessons-learned.md has a 2026-06-08 entry referencing the close-drizzle-migration track', () => {
      const lessons = read('measure/lessons-learned.md');
      // The convention is `(<date>, <track>)` at the start of a bullet
      // line. Accept any track id (some entries are tagged with the
      // broader migration track rather than the close-out track).
      const re =
        /^-\s+\(\s*2026-06-0[78]\s*,\s*(?:chore_close_drizzle_migration_20260607|chore_drizzle_migration_20260314|drizzle_cleanup_type_safety_20260506)\b[^)]*\)/m;
      expect(
        re.test(lessons),
        `lessons-learned.md must contain a dated entry from the close-out ` +
          `window (2026-06-07 or 2026-06-08) tagged with the close-drizzle ` +
          `track (or its parent tracks). The Drizzle mock-naming ` +
          `convention should be captured as a curated working-memory entry.`,
      ).toBe(true);
    });

    it('lessons-learned.md Drizzle-mock-naming entry mentions both old and new helper names', () => {
      const lessons = read('measure/lessons-learned.md');
      // Find a 2026-06-07/08 entry tagged with the close-drizzle track,
      // then assert it mentions at least one old/new helper pair so
      // the convention is concrete.
      const entryRe =
        /^-\s+\(\s*2026-06-0[78][^)]*\)\s+\*\*([\s\S]*?)(?=\n-|\n###|\n##|$)/gm;
      const candidates: string[] = [];
      let m: RegExpExecArray | null;
      while ((m = entryRe.exec(lessons)) !== null) {
        const body = m[1] ?? '';
        if (!/chore_close_drizzle_migration_20260607|chore_drizzle_migration_20260314|drizzle_cleanup_type_safety_20260506/.test(m[0])) {
          continue;
        }
        candidates.push(body);
      }
      expect(
        candidates.length,
        `No 2026-06-07/08 entry tagged with a close-drizzle track was found.`,
      ).toBeGreaterThan(0);
      const hasRenamePair = candidates.some(
        (body) =>
          /createPrismaMock|createMockPrisma|makePrisma|makeMoviePrisma/.test(
            body,
          ) && /createDbMock|createMockDb|makeDb|makeMovieDb/.test(body),
      );
      expect(
        hasRenamePair,
        `The 2026-06-07/08 entry must mention at least one old→new helper ` +
          `pair (e.g. \`createPrismaMock→createDbMock\`) so the convention ` +
          `is concrete. Found bodies:\n  ` +
          candidates.map((b) => b.slice(0, 200)).join('\n  '),
      ).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // S7.4 — Archive move: the track is at `measure/archive/<id>/`, not
  // `measure/tracks/<id>/`.
  // ─────────────────────────────────────────────────────────────────────────
  describe('S7.4: archive move (track directory relocated)', () => {
    it('the track directory is gone from `measure/tracks/`', () => {
      expect(
        fs.existsSync(TRACK_DIR_TRACKS),
        `Track directory must no longer exist at ${TRACK_DIR_TRACKS}. ` +
          `Green phase: \`mv measure/tracks/${TRACK_ID} measure/archive/${TRACK_ID}\`.`,
      ).toBe(false);
    });

    it('the track directory exists at `measure/archive/`', () => {
      expect(
        fs.existsSync(TRACK_DIR_ARCHIVE),
        `Track directory must exist at ${TRACK_DIR_ARCHIVE} after the ` +
          `archive move.`,
      ).toBe(true);
    });

    it('the archived plan.md is the same content as the in-progress plan.md was (S7 section preserved)', () => {
      // This test runs only after the archive move (precondition). The
      // archived plan.md must still contain the S7 heading and the
      // post-Green `[x]` checkboxes so a future reader of the archive
      // can see the closeout shipped.
      if (!fs.existsSync(TRACK_DIR_ARCHIVE)) {
        // Skip if archive hasn't happened (the precondition test fails
        // first; this is a follow-up guard).
        return;
      }
      const archivedPlan = fs.readFileSync(
        path.join(TRACK_DIR_ARCHIVE, 'plan.md'),
        'utf8',
      );
      expect(
        S7_HEADING_REGEX.test(archivedPlan),
        `Archived plan.md must still contain the S7 phase heading.`,
      ).toBe(true);
      const section = s7Section(archivedPlan);
      const open = section
        .split('\n')
        .filter((line) => /^\s*-\s+\[[ x~]\]/i.test(line))
        .filter((line) => !/^\s*-\s+\[x\]/i.test(line));
      expect(
        open,
        `Archived plan.md S7 section still has open checkboxes:\n  ` +
          open.join('\n  '),
      ).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // S7.5 — tracks.md closeout: the active-tracks entry has been removed
  // (or moved to the archived section).
  // ─────────────────────────────────────────────────────────────────────────
  describe('S7.5: tracks.md closeout (active entry removed)', () => {
    // Slice tracks.md into the "## Active Tracks" body — between the
    // heading and the NEXT `## ` heading. The bug-prone `match(/^##\s+/m)`
    // on the original slice would match the same line as the heading;
    // the helper below skips past the heading's own newline first.
    function activeTracksBody(tracks: string): { body: string; end: number } | null {
      const heading = tracks.match(/^##\s+Active\s+Tracks\b[^\n]*\n/m);
      if (!heading || heading.index === undefined) return null;
      const start = heading.index + heading[0].length;
      const tail = tracks.slice(start);
      const nextH = tail.match(/^##\s+/m);
      const end = nextH && nextH.index !== undefined ? start + nextH.index : tracks.length;
      return { body: tracks.slice(start, end), end };
    }

    it('tracks.md exists at the canonical path', () => {
      expect(
        fileExists('measure/tracks.md'),
        `tracks.md must exist at ${TRACKS_REGISTRY}`,
      ).toBe(true);
    });

    it('tracks.md has an `## Active Tracks` heading (sanity guard)', () => {
      const tracks = read('measure/tracks.md');
      expect(
        activeTracksBody(tracks),
        '`## Active Tracks` heading must exist in tracks.md',
      ).not.toBeNull();
    });

    it('tracks.md no longer lists this track under "Active Tracks"', () => {
      const tracks = read('measure/tracks.md');
      const section = activeTracksBody(tracks);
      expect(section, '`## Active Tracks` section not found').not.toBeNull();
      const stillActive = new RegExp(`\\b${TRACK_ID}\\b`).test(section!.body);
      expect(
        stillActive,
        `tracks.md still lists \`${TRACK_ID}\` under \`## Active Tracks\`. ` +
          `Green phase: remove the active entry and add a one-line ` +
          `archived entry (e.g. under the existing \`## Archived Tracks\` ` +
          `section or \`## Recently Completed (archived)\`).`,
      ).toBe(false);
    });

    it('tracks.md has an archived entry referencing this track (positive confirmation)', () => {
      const tracks = read('measure/tracks.md');
      const section = activeTracksBody(tracks);
      expect(section, '`## Active Tracks` section not found').not.toBeNull();
      const outsideActive =
        tracks.slice(0, section!.body.length === 0 ? 0 : tracks.indexOf(section!.body)) +
        tracks.slice(section!.end);
      // The "outside" text must mention the track id in either an
      // `[x]`-marked completed entry (e.g. `## Recently Completed
      // (archived)`) or a `## Archived Tracks` line. We use a
      // permissive match (just the track id appearing in the outside
      // text) so the Green phase can pick the wording.
      const mentionedOutside = new RegExp(`\\b${TRACK_ID}\\b`).test(outsideActive);
      expect(
        mentionedOutside,
        `tracks.md must reference \`${TRACK_ID}\` outside the \`## Active ` +
          `Tracks\` section (e.g. in \`## Recently Completed (archived)\` or ` +
          `\`## Archived Tracks\`).`,
      ).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // S7.6 — Grep verification: zero `$executeRawUnsafe` / `$queryRawUnsafe`
  // / `PrismaClient` / `createPrismaMock` / `createMockPrisma` /
  // `makePrisma` / `makeMoviePrisma` hits in non-archived PRODUCTION
  // code.
  //
  // Scope rationale: the S7 task says "non-archived code". The
  // close-drizzle-migration test files (`tests/closeDrizzleMigration.s*.ts`)
  // are the migration's own tests — they are archived with the track and
  // legitimately reference the old Prisma names as test data (S5.1-S5.9
  // assert the renames happened, S5 file documents the pre/post names
  // in constants and regex patterns). The legacy `.js` test files in
  // `tests/*.js` (e.g. `prisma-init.test.js`, `tv-models.test.js`,
  // `tests/helpers/test-prisma-client.js`) were deliberately out of S5
  // scope (the S5 plan only renamed `.ts` test files) and are tracked
  // separately as a known-out-of-scope backlog item rather than a
  // regression. The S7.6a test scopes to production code only:
  // `server/src/**/*` EXCLUDING `*.test.ts`, plus `app/**/*` and
  // `clients/**/*`. The S7.6b test documents the test-file residue
  // separately so the Green phase can decide what to address.
  //
  // The S7 live gate (`CI=true npm test` + `npm run typecheck` + lint)
  // is owned by the Green phase / archive role per the plan.md live-gate
  // note. This grep is the in-process, bounded proof the user-facing
  // claim ("zero Prisma residue") is true at archive time.
  // ─────────────────────────────────────────────────────────────────────────
  describe('S7.6: grep verification (zero Prisma residue in production code)', () => {
    // Patterns that the S7 closeout grep asserts are absent. Each
    // pattern is a word-boundary regex — substring matches like
    // `makePrismaMock` (a local helper) do not fail the suite because
    // they are different identifiers.
    const PRODUCTION_RESIDUE_PATTERNS: RegExp[] = [
      /\$executeRawUnsafe\b/,
      /\$queryRawUnsafe\b/,
      /\bPrismaClient\b/,
      /\bcreatePrismaMock\b/,
      /\bcreateMockPrisma\b/,
      /\bmakePrisma\b/,
      /\bmakeMoviePrisma\b/,
    ];

    function grepProductionResidueHits(roots: string[]): { file: string; line: number; pattern: string; snippet: string }[] {
      const hits: { file: string; line: number; pattern: string; snippet: string }[] = [];
      for (const root of roots) {
        if (!fs.existsSync(root)) continue;
        const stack: string[] = [root];
        while (stack.length > 0) {
          const current = stack.pop()!;
          const entries = fs.readdirSync(current, { withFileTypes: true });
          for (const entry of entries) {
            const full = path.join(current, entry.name);
            if (entry.isDirectory()) {
              if (
                entry.name === 'node_modules' ||
                entry.name === 'dist' ||
                entry.name === '__tests__' ||
                entry.name.startsWith('.')
              )
                continue;
              stack.push(full);
            } else if (entry.isFile() && /\.[jt]sx?$/.test(entry.name)) {
              // Production-code scope excludes test files. Test files
              // are tracked separately in S7.6b.
              if (/\.test\.[jt]sx?$/.test(entry.name)) continue;
              if (/\.spec\.[jt]sx?$/.test(entry.name)) continue;
              const rel = path.relative(REPO_ROOT, full);
              if (rel === SELF) continue;
              const content = fs.readFileSync(full, 'utf8');
              const lines = content.split('\n');
              for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                for (const re of PRODUCTION_RESIDUE_PATTERNS) {
                  if (re.test(line)) {
                    hits.push({
                      file: rel,
                      line: i + 1,
                      pattern: re.source,
                      snippet: line.trim().slice(0, 160),
                    });
                  }
                }
              }
            }
          }
        }
      }
      return hits;
    }

    it('zero Prisma residue hits in server/src production code (EXCLUDES *.test.ts)', () => {
      const hits = grepProductionResidueHits([SERVER_SRC]);
      expect(
        hits,
        'Server production code still has Prisma residue. Each line ' +
          'below matches a forbidden pattern. The S2 Green left 3 ' +
          '`prisma.$queryRawUnsafe` fallbacks in `statsRoutes.ts` (lines ' +
          '279/298/317) inside the `else` branch of the `if (prisma.db?.all)` ' +
          'rewrite — remove the `else` branch entirely. The Green phase ' +
          'must clear every hit before archive. First 30 hits:\n  ' +
          hits
            .slice(0, 30)
            .map((h) => `${h.file}:${h.line} [${h.pattern}] → ${h.snippet}`)
            .join('\n  '),
      ).toEqual([]);
    });

    it('zero Prisma residue hits in app/**/* (React SPA) and clients/**/* (Flutter)', () => {
      const hits = grepProductionResidueHits([APP_DIR]);
      expect(
        hits,
        'App source still has Prisma residue:\n  ' +
          hits
            .slice(0, 30)
            .map((h) => `${h.file}:${h.line} [${h.pattern}] → ${h.snippet}`)
            .join('\n  '),
      ).toEqual([]);
    });

    it('zero Prisma residue hits in clients/**/* (Flutter) — sanity guard', () => {
      const hits = grepProductionResidueHits([
        path.join(REPO_ROOT, 'clients'),
      ]);
      expect(
        hits,
        'Client source still has Prisma residue:\n  ' +
          hits
            .slice(0, 30)
            .map((h) => `${h.file}:${h.line} [${h.pattern}] → ${h.snippet}`)
            .join('\n  '),
      ).toEqual([]);
    });

    it('audit-results.md exists for this track (sanity guard)', () => {
      expect(
        fileExists(path.relative(REPO_ROOT, S7_AUDIT_PATH)),
        `audit-results.md must exist at ${S7_AUDIT_PATH} — the S1 audit ` +
          `committed it; the archived move must preserve it.`,
      ).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // S7.6b — Test-file residue documentation. Scoped to test files that
  // are in scope for the close-drizzle-migration cleanup but are NOT
  // the migration's own test files (S1, S5.1-5.9 must keep referencing
  // old names as test data) and NOT the legacy `.js` test files (those
  // are out of S5 scope and a separate cleanup track concern).
  //
  // In-scope test files for S7:
  //   - `server/src/**/*.test.ts` (route + service + repo unit tests)
  //   - `tests/**/*.test.ts` (top-level integration tests)
  //
  // Out-of-scope for S7 (documented exceptions):
  //   - `tests/closeDrizzleMigration.s*.test.ts` (migration's own tests
  //     S2..S7; S5.1-5.9 reference old names as test data)
  //   - `tests/closeDrizzleMigration.audit.test.ts` (S1 audit; also
  //     part of the migration's own test suite, just with a different
  //     naming convention — `audit` instead of `s1`/`sN`)
  //   - `tests/prismaShimRemoval.audit.test.ts` (superseded S1 test from
  //     `remove_prisma_shim_20260508` — kept for historical reference;
  //     its own Plan note documents the redundancy with the new
  //     `closeDrizzleMigration.audit.test.ts`)
  //   - `tests/*.js` (legacy `.js` test files using
  //     `createTestPrismaClient` — pre-Drizzle API; out of S5 scope)
  //   - `tests/helpers/test-prisma-client.js` (the legacy helper itself)
  //
  // The Red-state expectation is that this list is NON-EMPTY (real
  // residue exists). The Green phase must clear every entry. After
  // Green, this test PASSES (zero residue). The test serves as the
  // post-Green contract: "all in-scope test files are Drizzle-clean".
  // ─────────────────────────────────────────────────────────────────────────
  describe('S7.6b: test-file residue (Drizzle-clean contract for in-scope test files)', () => {
    const MIGRATION_SUITE_FILES = new Set<string>([
      // S1 audit (different naming convention — `audit` not `s1`)
      'tests/closeDrizzleMigration.audit.test.ts',
      // S2..S7
      'tests/closeDrizzleMigration.s2.replacement.test.ts',
      'tests/closeDrizzleMigration.s3.routes.test.ts',
      'tests/closeDrizzleMigration.s4.shimRemotion.test.ts',
      'tests/closeDrizzleMigration.s5.namingResidue.test.ts',
      'tests/closeDrizzleMigration.s6.openaiApiKeyCleanup.test.ts',
    ]);
    const SUPERSEDED_S1_TEST = 'tests/prismaShimRemoval.audit.test.ts';
    const LEGACY_HELPER = 'tests/helpers/test-prisma-client.js';

    function isInScopeTestFile(rel: string): boolean {
      if (rel === SELF) return false;
      if (MIGRATION_SUITE_FILES.has(rel)) return false;
      if (rel === SUPERSEDED_S1_TEST) return false;
      if (rel === LEGACY_HELPER) return false;
      if (rel.endsWith('.js')) return false;
      return /\.test\.[jt]sx?$/.test(rel);
    }

    function grepTestResidueHits(): { file: string; line: number; pattern: string; snippet: string }[] {
      const hits: { file: string; line: number; pattern: string; snippet: string }[] = [];
      const testRoots = [
        path.join(SERVER_SRC),
        TESTS_DIR,
      ];
      for (const root of testRoots) {
        if (!fs.existsSync(root)) continue;
        const stack: string[] = [root];
        while (stack.length > 0) {
          const current = stack.pop()!;
          const entries = fs.readdirSync(current, { withFileTypes: true });
          for (const entry of entries) {
            const full = path.join(current, entry.name);
            if (entry.isDirectory()) {
              if (
                entry.name === 'node_modules' ||
                entry.name === 'dist' ||
                entry.name.startsWith('.')
              )
                continue;
              stack.push(full);
            } else if (entry.isFile() && /\.[jt]sx?$/.test(entry.name)) {
              const rel = path.relative(REPO_ROOT, full);
              if (!isInScopeTestFile(rel)) continue;
              const content = fs.readFileSync(full, 'utf8');
              const lines = content.split('\n');
              for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                for (const re of RESIDUE_PATTERNS) {
                  if (re.test(line)) {
                    hits.push({
                      file: rel,
                      line: i + 1,
                      pattern: re.source,
                      snippet: line.trim().slice(0, 160),
                    });
                  }
                }
              }
            }
          }
        }
      }
      return hits;
    }

    it('zero Prisma residue hits in in-scope test files (server/src + tests, EXCLUDES migration suite + legacy .js + superseded S1 test)', () => {
      const hits = grepTestResidueHits();
      expect(
        hits,
        'In-scope test files still reference the Prisma residue patterns. ' +
          'The Green phase must clear every hit. Known offenders at the ' +
          'start of S7 (2026-06-08, see plan.md live-gate note): ' +
          '`manualTestFindings.regression.test.ts` (3 `$executeRawUnsafe` ' +
          'mocks), `stats.integration.test.ts` (2 mocks), `statsRoutes.test.ts` ' +
          '(3 mocks). The Green phase updates the mocks to match the new ' +
          '`db.all(sql\`...\`)` API. First 30 hits:\n  ' +
          hits
            .slice(0, 30)
            .map((h) => `${h.file}:${h.line} [${h.pattern}] → ${h.snippet}`)
            .join('\n  '),
      ).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // S7.7 — Test-file self-consistency: vacuous-pass guard.
  // ─────────────────────────────────────────────────────────────────────────
  describe('S7.7: test-file self-consistency (vacuous-pass guard)', () => {
    it('S7 test file exists at the canonical path', () => {
      expect(
        fileExists('tests/closeDrizzleMigration.s7.verification.test.ts'),
        `S7 test file must be at tests/closeDrizzleMigration.s7.verification.test.ts`,
      ).toBe(true);
    });

    it('S7 test file contains at least 7 describe blocks (S7.1–S7.7)', () => {
      const content = read('tests/closeDrizzleMigration.s7.verification.test.ts');
      const describeCount = (content.match(/describe\s*\(\s*['"`]/g) || []).length;
      expect(
        describeCount,
        `S7 test file must have at least 7 describe blocks (S7.1–S7.7); got ${describeCount}`,
      ).toBeGreaterThanOrEqual(7);
    });

    it('S7 test file has post-Green assertions against plan.md, tech-debt.md, and the archive move', () => {
      const content = read('tests/closeDrizzleMigration.s7.verification.test.ts');
      const hasPostGreenAssertion =
        /expect\([^)]*\[x\]/.test(content) ||
        /expect\([^)]*Resolved/.test(content) ||
        /expect\([^)]*Stale env key/.test(content) ||
        /expect\([^)]*archive/i.test(content);
      expect(
        hasPostGreenAssertion,
        `S7 test file must contain at least one \`expect(…[x])\`, ` +
          `\`expect(…Resolved)\`, \`expect(…Stale env key)\`, or ` +
          `\`expect(…archive)\` assertion.`,
      ).toBe(true);
    });
  });
});
