import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// ─────────────────────────────────────────────────────────────────────────────
// chore_close_drizzle_migration_20260607 — Phase S6 Red
//
// Goal: remove the stale `OPENAI_API_KEY` from `.env` and confirm the
// `AI_GATEWAY_BASE_URL` config is the active AI path. The project migrated
// from OpenAI to OpenRouter (chore_openrouter_migration_20260329) and then
// to a local gateway (feature_local_llm_gateway_20260401), but the old
// `OPENAI_API_KEY` line remained in `.env` as legacy noise. The actual key
// line was already removed prior to this phase; the remaining work is the
// closeout — verify the post-state, mark the tech-debt entry Resolved, mark
// the plan tasks complete, and acknowledge in audit-results.md.
//
// Red-phase shape (failing for the expected missing behavior):
//
//   S6.1 — .env precondition: no `OPENAI_API_KEY` line, `AI_GATEWAY_BASE_URL`
//          configured. PASSES today (the .env is already in the post-state).
//   S6.2 — Code precondition: zero `OPENAI_API_KEY` references in
//          `server/src/**/*.ts` and `tests/**/*.ts`. PASSES today (the old
//          identifier was renamed in chore_openrouter_migration_20260329).
//   S6.3 — Plan closeout: every S6 task in plan.md is marked `[x]`. FAILS
//          today (tasks are `[~]` mid-Red; Green will flip to `[x]`).
//   S6.4 — Tech-debt closeout: the OPENAI_API_KEY row in
//          `measure/tech-debt.md` is marked `Resolved`. FAILS today (the row
//          is still `Open`).
//   S6.5 — Audit-results closeout: `measure/tracks/.../audit-results.md`
//          has a dedicated "Stale env key" / S6 section acknowledging the
//          removal. FAILS today (the artifact does not yet have that
//          section — the original 2026-03-29 audit covered raw-method
//          residue, not env-key residue).
//   S6.6 — S6 test file self-consistency: inventory constants and the test
//          file's own assertions agree. PASSES today (sanity guard).
//
// The S6 test uses the same `REPO_ROOT` + filesystem scanner helpers
// established in `tests/closeDrizzleMigration.audit.test.ts` (S1) and the
// per-phase shim/naming suites (S4/S5) so the close-drizzle-migration
// suite stays consistent. The S6 file deliberately does NOT delete
// `OPENAI_API_KEY` from `.env` itself — that is the Green phase's commit.
// ─────────────────────────────────────────────────────────────────────────────

const REPO_ROOT = path.resolve(__dirname, '..');
const SERVER_SRC = path.join(REPO_ROOT, 'server', 'src');
const TESTS_DIR = path.join(REPO_ROOT, 'tests');
const APP_DIR = path.join(REPO_ROOT, 'app');
const CLIENTS_DIR = path.join(REPO_ROOT, 'clients');
const MEASURE_DIR = path.join(REPO_ROOT, 'measure');

const ENV_PATH = path.join(REPO_ROOT, '.env');
const PLAN_PATH = path.join(
  MEASURE_DIR,
  'archive',
  'chore_close_drizzle_migration_20260607',
  'plan.md',
);
const TECH_DEBT_PATH = path.join(MEASURE_DIR, 'tech-debt.md');
const AUDIT_RESULTS_PATH = path.join(
  MEASURE_DIR,
  'archive',
  'chore_close_drizzle_migration_20260607',
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
          entry.name === 'node_modules' ||
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

function envLineHasKey(envText: string, key: string): boolean {
  // Match `KEY=...` at line start, optionally preceded by whitespace. Skip
  // comment lines (`# KEY=...`) since those are documentation, not config.
  const re = new RegExp(`^\\s*(?!#)\\s*${key}\\s*=\\s*\\S`, 'm');
  return re.test(envText);
}

// Sections of plan.md that describe the S6 closeout work. The Red-phase
// tests assert every checkbox under the S6 heading is `[x]` (post-Green
// state). The S6 heading itself is identified by the spec/story title so
// the test does not break if other phases are inserted nearby.
const S6_HEADING_REGEX = /^##\s+Phase\s+S6:\s+Remove\s+stale\s+OPENAI_API_KEY\s+from\s+\.env\s*$/m;
const S6_NEXT_HEADING_REGEX = /^##\s+Phase\s+S7:/m;

// Tech-debt row for the stale `OPENAI_API_KEY`. The table columns are:
//   0=Date | 1=Track | 2=Item | 3=Severity | 4=Status | 5=Notes
// We match the row by the unique substring "Old `OPENAI_API_KEY`" in the
// Item column (index 2), then capture the Status column (index 4) by
// splitting the row on `|`. Returns `null` if the row is not found.
function findOpenaiTechDebtRow(debt: string): { status: string } | null {
  const rows = debt.split('\n').filter((line) => line.trim().startsWith('|'));
  for (const row of rows) {
    const cells = row.split('|').map((c) => c.trim());
    // Filter out empty leading/trailing cells produced by the leading +
    // trailing `|` in markdown table rows.
    const body = cells.slice(1, -1);
    if (body.length < 6) continue;
    if (!/Old\s+`OPENAI_API_KEY`/i.test(body[2] ?? '')) continue;
    return { status: body[4] ?? '' };
  }
  return null;
}

describe('chore_close_drizzle_migration_20260607 — Phase S6: Remove stale OPENAI_API_KEY from .env (Red)', () => {
  // ─────────────────────────────────────────────────────────────────────────
  // S6.1 — .env precondition: the file is already in the post-Green state.
  //
  // The actual `.env` edit was applied before this track started; the
  // remaining S6 work is the closeout (plan/tech-debt/audit-results).
  // These precondition tests guard against a future regression where
  // someone re-introduces the line.
  // ─────────────────────────────────────────────────────────────────────────
  describe('S6.1: .env precondition (OPENAI_API_KEY absent, AI_GATEWAY_BASE_URL configured)', () => {
    it('.env exists at the repo root', () => {
      expect(fileExists('.env'), `${ENV_PATH} must exist`).toBe(true);
    });

    it('.env does not contain a non-commented `OPENAI_API_KEY=…` line', () => {
      const env = read('.env');
      const present = envLineHasKey(env, 'OPENAI_API_KEY');
      expect(
        present,
        `.env still contains an active \`OPENAI_API_KEY=…\` line — remove it. ` +
          `Comment lines (e.g. \`# OPENAI_API_KEY=…\`) are fine for documentation.`,
      ).toBe(false);
    });

    it('.env configures `AI_GATEWAY_BASE_URL`', () => {
      const env = read('.env');
      const present = envLineHasKey(env, 'AI_GATEWAY_BASE_URL');
      expect(
        present,
        `.env must configure \`AI_GATEWAY_BASE_URL=…\` so the local AI gateway ` +
          `remains the active AI provider.`,
      ).toBe(true);
    });

    it('.env configures `AI_GATEWAY_MODEL`', () => {
      const env = read('.env');
      const present = envLineHasKey(env, 'AI_GATEWAY_MODEL');
      expect(
        present,
        `.env must configure \`AI_GATEWAY_MODEL=…\` so ReleaseParserProvider ` +
          `has a model to route through the gateway.`,
      ).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // S6.2 — Code precondition: no `OPENAI_API_KEY` identifier in source or
  // test code. The OpenRouter migration (chore_openrouter_migration_20260329)
  // already renamed every reference; S6 just verifies the residue is gone.
  // ─────────────────────────────────────────────────────────────────────────
  describe('S6.2: code precondition (zero `OPENAI_API_KEY` references in non-archived source)', () => {
    function grepHits(roots: string[]): { file: string; line: number; snippet: string }[] {
      const re = /\bOPENAI_API_KEY\b/g;
      const hits: { file: string; line: number; snippet: string }[] = [];
      for (const root of roots) {
        for (const file of listSourceFiles(root)) {
          const content = fs.readFileSync(file, 'utf8');
          const lines = content.split('\n');
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const local = new RegExp(re.source, 'g');
            let m: RegExpExecArray | null;
            while ((m = local.exec(line)) !== null) {
              hits.push({
                file: path.relative(REPO_ROOT, file),
                line: i + 1,
                snippet: line.trim(),
              });
            }
          }
        }
      }
      return hits;
    }

    it('no `OPENAI_API_KEY` identifier in server/src/**/*.ts', () => {
      const hits = grepHits([SERVER_SRC]).filter((h) => h.file !== SELF);
      expect(
        hits,
        `Server source still references \`OPENAI_API_KEY\`:\n  ` +
          hits.map((h) => `${h.file}:${h.line} → ${h.snippet}`).join('\n  '),
      ).toEqual([]);
    });

    it('no `OPENAI_API_KEY` identifier in tests/**/*.ts', () => {
      const hits = grepHits([TESTS_DIR]).filter(
        (h) => h.file !== SELF && h.file !== 'tests/closeDrizzleMigration.s7.verification.test.ts',
      );
      expect(
        hits,
        `Top-level tests still reference \`OPENAI_API_KEY\`:\n  ` +
          hits.map((h) => `${h.file}:${h.line} → ${h.snippet}`).join('\n  '),
      ).toEqual([]);
    });

    it('no `OPENAI_API_KEY` identifier in app/**/*.{ts,tsx}', () => {
      const hits = grepHits([APP_DIR]).filter((h) => h.file !== SELF);
      expect(
        hits,
        `App source still references \`OPENAI_API_KEY\`:\n  ` +
          hits.map((h) => `${h.file}:${h.line} → ${h.snippet}`).join('\n  '),
      ).toEqual([]);
    });

    it('no `OPENAI_API_KEY` identifier in clients/**/*.{ts,tsx}', () => {
      const hits = grepHits([CLIENTS_DIR]).filter((h) => h.file !== SELF);
      expect(
        hits,
        `Client source still references \`OPENAI_API_KEY\`:\n  ` +
          hits.map((h) => `${h.file}:${h.line} → ${h.snippet}`).join('\n  '),
      ).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // S6.3 — Plan closeout: every S6 task in plan.md is marked `[x]`.
  //
  // The plan heading for S6 is the unique `## Phase S6: Remove stale
  // OPENAI_API_KEY from .env` line; the test slices the plan between that
  // heading and the next `## Phase` heading, then asserts every checkbox
  // line is `[x]`. This is the exact missing-behavior the Green phase
  // resolves — tasks move from `[ ]` / `[~]` to `[x]` when the work
  // ships and the closeout commit is made.
  // ─────────────────────────────────────────────────────────────────────────
  describe('S6.3: plan.md S6 closeout (all S6 tasks marked [x])', () => {
    function s6Section(plan: string): string {
      const heading = plan.match(S6_HEADING_REGEX);
      if (!heading || heading.index === undefined) return '';
      const start = heading.index + heading[0].length;
      const tail = plan.slice(start);
      const next = tail.match(S6_NEXT_HEADING_REGEX);
      const end = next && next.index !== undefined ? start + next.index : plan.length;
      return plan.slice(start, end);
    }

    it('plan.md contains the S6 phase heading', () => {
      const plan = read(
        path.relative(REPO_ROOT, PLAN_PATH),
      );
      expect(
        S6_HEADING_REGEX.test(plan),
        `plan.md must contain the S6 phase heading:\n  ## Phase S6: Remove stale OPENAI_API_KEY from .env`,
      ).toBe(true);
    });

    it('every S6 checkbox in plan.md is marked `[x]` (closeout complete)', () => {
      const plan = read(
        path.relative(REPO_ROOT, PLAN_PATH),
      );
      const section = s6Section(plan);
      expect(section, 'S6 section not found in plan.md').not.toBe('');
      const checkboxLines = section
        .split('\n')
        .filter((line) => /^\s*-\s+\[[ x~]\]/i.test(line));
      expect(
        checkboxLines.length,
        `S6 section must contain at least one checkbox (got ${checkboxLines.length})`,
      ).toBeGreaterThan(0);
      const open = checkboxLines.filter((line) => !/^\s*-\s+\[x\]/i.test(line));
      expect(
        open,
        `S6 checkboxes still open (Green phase must flip them to [x]):\n  ` +
          open.join('\n  '),
      ).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // S6.4 — Tech-debt closeout: the OPENAI_API_KEY row in
  // `measure/tech-debt.md` is marked `Resolved`.
  //
  // The row was added by chore_openrouter_migration_20260329 (Status: Open,
  // Note: "Cleanup in Phase 4 of OpenRouter migration track"). This track
  // is the cleanup; the Green phase must flip the Status to `Resolved`
  // and append a closure note.
  // ─────────────────────────────────────────────────────────────────────────
  describe('S6.4: tech-debt.md closeout (OPENAI_API_KEY row marked Resolved)', () => {
    it('tech-debt.md has a row for the stale `OPENAI_API_KEY`', () => {
      const debt = read('measure/tech-debt.md');
      const row = findOpenaiTechDebtRow(debt);
      expect(
        row,
        `tech-debt.md must contain a row whose Item column starts with ` +
          `\`Old \\\`OPENAI_API_KEY\\\`\`. The original 2026-03-29 row from ` +
          `chore_openrouter_migration_20260329 is the canonical entry.`,
      ).not.toBeNull();
    });

    it('the OPENAI_API_KEY row is marked `Resolved`', () => {
      const debt = read('measure/tech-debt.md');
      const row = findOpenaiTechDebtRow(debt);
      expect(
        row,
        `OPENAI_API_KEY tech-debt row not found — see S6.4 precondition.`,
      ).not.toBeNull();
      const status = row!.status;
      expect(
        status,
        `tech-debt.md OPENAI_API_KEY row Status must be \`Resolved\` (got \`${status}\`). ` +
          `Green phase: flip Status to \`Resolved\` and append a closure note ` +
          `pointing at this track.`,
      ).toBe('Resolved');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // S6.5 — Audit-results closeout: the track's `audit-results.md` has a
  // dedicated S6 section acknowledging the env-key removal.
  //
  // The original 2026-03-29 audit only covered raw-method residue. S6
  // needs a "Stale env key" or similar section that documents the
  // post-state (file checked, keys absent, gateway present) so the
  // future reader of the artifact can confirm the closeout shipped.
  // ─────────────────────────────────────────────────────────────────────────
  describe('S6.5: audit-results.md S6 section (stale env key acknowledged)', () => {
    it('audit-results.md exists for this track', () => {
      expect(
        fileExists(
          path.relative(REPO_ROOT, AUDIT_RESULTS_PATH),
        ),
        `audit-results.md must exist for this track at ${AUDIT_RESULTS_PATH}.`,
      ).toBe(true);
    });

    it('audit-results.md has a section acknowledging the S6 env-key cleanup', () => {
      const audit = read(
        path.relative(REPO_ROOT, AUDIT_RESULTS_PATH),
      );
      // Section heading patterns that are acceptable for the S6 closeout
      // acknowledgement. We accept any of the three so the Green phase
      // can pick the wording that best fits the artifact.
      const patterns: RegExp[] = [
        /^##\s+Stale\s+env\s+key\s*$/im,
        /^##\s+S6:\s+Stale\s+env\s+key/im,
        /^##\s+Phase\s+S6:/im,
        /^##\s+Env[\s-]?key\s+residue/im,
      ];
      const matched = patterns.some((re) => re.test(audit));
      expect(
        matched,
        `audit-results.md must have a section acknowledging the S6 env-key ` +
          `cleanup. Acceptable headings: \`## Stale env key\`, \`## S6: Stale ` +
          `env key\`, \`## Phase S6: …\`, or \`## Env-key residue\`.`,
      ).toBe(true);
    });

    it('the S6 section in audit-results.md confirms no `OPENAI_API_KEY` in .env', () => {
      const audit = read(
        path.relative(REPO_ROOT, AUDIT_RESULTS_PATH),
      );
      // The section should mention the post-state. Accept either an
      // explicit "OPENAI_API_KEY" mention or a "no stale env key" /
      // "removed" / "absent" acknowledgement. The test is intentionally
      // permissive on wording but strict on the keyword.
      const sectionRe =
        /(?:##\s+(?:Stale\s+env\s+key|S6:\s+Stale\s+env\s+key|Phase\s+S6:[\s\S]*?|Env[\s-]?key\s+residue)[\s\S]*?)(?=^##\s+)/im;
      const section = audit.match(sectionRe)?.[0] ?? '';
      const hasMention = /OPENAI_API_KEY|openai[\s_-]?api[\s_-]?key|stale\s+env/i.test(
        section,
      );
      expect(
        hasMention,
        `The S6 section in audit-results.md must mention the OPENAI_API_KEY ` +
          `removal (or the general "stale env key" topic). Current section:\n` +
          section.slice(0, 400),
      ).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // S6.6 — Test-file self-consistency: the S6 test file's own constants
  // are findable, and the assertion guards against the S6 file going
  // silently empty (vacuous-pass protection).
  // ─────────────────────────────────────────────────────────────────────────
  describe('S6.6: test-file self-consistency (vacuous-pass guard)', () => {
    it('S6 test file exists at the canonical path', () => {
      expect(
        fileExists('tests/closeDrizzleMigration.s6.openaiApiKeyCleanup.test.ts'),
        `S6 test file must be at tests/closeDrizzleMigration.s6.openaiApiKeyCleanup.test.ts`,
      ).toBe(true);
    });

    it('S6 test file contains at least 6 describe blocks (S6.1–S6.6)', () => {
      const content = read(
        'tests/closeDrizzleMigration.s6.openaiApiKeyCleanup.test.ts',
      );
      const describeCount = (content.match(/describe\s*\(\s*['"`]/g) || []).length;
      expect(
        describeCount,
        `S6 test file must have at least 6 describe blocks (S6.1–S6.6); got ${describeCount}`,
      ).toBeGreaterThanOrEqual(6);
    });

    it('S6 test file has at least one assertion against the post-Green state', () => {
      const content = read(
        'tests/closeDrizzleMigration.s6.openaiApiKeyCleanup.test.ts',
      );
      // The post-Green state includes `[x]` plan checkboxes, `Resolved`
      // tech-debt status, and an S6 section in audit-results.md. At
      // least one of these keywords must appear as an `expect` target.
      const hasPostGreenAssertion =
        /expect\([^)]*\[x\]/.test(content) ||
        /expect\([^)]*Resolved/.test(content) ||
        /expect\([^)]*Stale\s+env\s+key/.test(content);
      expect(
        hasPostGreenAssertion,
        `S6 test file must contain at least one \`expect(…[x])\`, ` +
          `\`expect(…Resolved)\`, or \`expect(…Stale env key)\` assertion.`,
      ).toBe(true);
    });
  });
});
