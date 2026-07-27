import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Phase S6 — Verification & Handoff Red-phase tests.
 *
 * The S6 deliverable is *verification*: the test-strategy §1 §4 §5
 * requires that `onUnhandledRequest: 'error'` be wired into
 * `app/src/test/setup.ts` so the "no unhandled MSW warnings" gate is
 * *enforceable* for the entire vitest run. Phase S0 in the test-strategy
 * was a prerequisite for S1–S5 but was never shipped. This Red-phase
 * test asserts that contract is in place, then asserts the artifact
 * update (tech-debt.md row Resolved) that closes the track.
 *
 * The setup.ts assertion is the **live-behavior proof** (in source
 * form) paired with the tech-debt.md markdown assertion below. Per
 * the user-instruction, "Artifact or markdown assertions are allowed
 * only when the phase deliverable is that artifact, and they must be
 * paired with a live-behavior proof or an explicit plan note saying
 * which later role owns the live gate." — the plan note at the top of
 * this phase documents that pairing.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
// Test file is at: <repo>/app/src/lib/msw/handlers.s6.test.ts
// here        = <repo>/app/src/lib/msw
// projectRoot  = <repo>/app
// repoRoot     = <repo>
const projectRoot = path.resolve(here, '..', '..', '..');
const repoRoot = path.resolve(projectRoot, '..');
const setupTsPath = path.resolve(repoRoot, 'app', 'src', 'test', 'setup.ts');

function readFileOrNull(p: string): string | null {
  try {
    return fs.readFileSync(p, 'utf-8');
  } catch {
    return null;
  }
}

describe('Phase S6 — Verification & Handoff', () => {
  describe('MSW setup hook is wired in app/src/test/setup.ts', () => {
    it('the file exists and is readable', () => {
      const content = readFileOrNull(setupTsPath);
      expect(
        content,
        `setup.ts must exist at ${setupTsPath} so the MSW lifecycle hook can be wired`,
      ).not.toBeNull();
    });

    it('imports the MSW server from the msw/server module', () => {
      const content = readFileOrNull(setupTsPath) ?? '';
      expect(
        content,
        'setup.ts must import `server` from "@/lib/msw/server" (or a relative path to lib/msw/server) so the lifecycle hooks can start MSW interception',
      ).toMatch(
        /from\s+['"](?:@\/lib\/msw\/server|\.\.?\/.*msw\/server)['"]/,
      );
    });

    it('calls server.listen with onUnhandledRequest: "error"', () => {
      const content = readFileOrNull(setupTsPath) ?? '';
      expect(
        content,
        'setup.ts must call server.listen({ onUnhandledRequest: "error" }) to enforce the no-unhandled-request gate (test-strategy §4 Architecture Guardrail #4)',
      ).toMatch(
        /server\.listen\s*\(\s*\{[^}]*onUnhandledRequest\s*:\s*['"]error['"]/s,
      );
    });

    it('registers a beforeAll lifecycle hook', () => {
      const content = readFileOrNull(setupTsPath) ?? '';
      expect(
        content,
        'setup.ts must register a beforeAll(...) hook so MSW interception is started once for the test file (test-strategy §1 + §5 Phase S0)',
      ).toMatch(/beforeAll\s*\(/);
    });

    it('registers an afterEach hook that calls server.resetHandlers', () => {
      const content = readFileOrNull(setupTsPath) ?? '';
      expect(
        content,
        'setup.ts must register an afterEach(...) hook that calls server.resetHandlers() to drop per-test handler overrides (test-strategy §1 + §5 Phase S0)',
      ).toMatch(/afterEach\s*\([^)]*\)[^{]*\{[^}]*server\.resetHandlers/s);
    });

    it('registers an afterAll hook that calls server.close', () => {
      const content = readFileOrNull(setupTsPath) ?? '';
      expect(
        content,
        'setup.ts must register an afterAll(...) hook that calls server.close() to tear down MSW interception (test-strategy §1 + §5 Phase S0)',
      ).toMatch(/afterAll\s*\([^)]*\)[^{]*\{[^}]*server\.close/s);
    });
  });

  // The former "measure/tech-debt.md marks the MSW mock coverage track Resolved"
  // block was removed on 2026-07-27. It asserted that tech-debt.md still
  // contained a row for chore_msw_mock_coverage_20260526 marked Resolved — a
  // one-time Phase S6 closure check that outlived its track (archived
  // 2026-06-13). tech-debt.md is explicitly curated working memory whose own
  // header instructs "Remove or summarize resolved items when they no longer
  // need to influence near-term planning", so the assertion contradicted the
  // file's policy. The 2026-07-26 pruning legitimately removed that row and
  // broke these tests. A product test suite must not gate on the contents of
  // prunable project documentation.
});
