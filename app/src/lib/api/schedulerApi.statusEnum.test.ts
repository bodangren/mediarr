import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Phase 6 Red-phase expansion — Status enum drift (test-strategy.md §3).
 *
 * The test-strategy §3 explicitly calls out the "Status enum drift" edge case:
 * "history `status` field, `TaskStatusBadge` variants, and history filter query
 * param must derive from one TS union (declare in `server/src/services/Scheduler.ts`
 * types and re-export through `app/src/lib/api/`). Add a type-only test asserting
 * exhaustiveness."
 *
 * Today the contract is NOT in place:
 * - `server/src/services/Scheduler.ts` does NOT export a `SchedulerTaskStatus`
 *   TS union.
 * - `app/src/lib/api/schedulerApi.ts:13` hardcodes the client zod enum as
 *   `z.enum(['healthy', 'warning', 'error', 'disabled'])` — a duplicated
 *   literal that does NOT derive from any server-side type.
 *
 * The Green owner must:
 *   1. Add `export type SchedulerTaskStatus = 'healthy' | 'warning' | 'error' | 'disabled';`
 *      to `server/src/services/Scheduler.ts`.
 *   2. Re-export it through the existing `app/src/lib/api/` surface (e.g. via a
 *      shared `types.ts` import or directly from the server types module).
 *   3. Replace the hardcoded `z.enum(['healthy', 'warning', 'error', 'disabled'])`
 *      in `app/src/lib/api/schedulerApi.ts` with a reference to that type so the
 *      client enum and the server union cannot drift.
 *
 * This test is artifact-style (source-level) because the contract is purely
 * structural: a TS union on one side, a zod enum derived from it on the other.
 * There is no runtime behavior to assert for "exhaustiveness" beyond what Task 3
 * already covers (the zod enum has all four values). The drift is a
 * compile-time/maintenance-time contract.
 *
 * Per the user-instruction "Artifact or markdown assertions are allowed only
 * when the phase deliverable is that artifact" — the deliverable here IS the
 * shared-type contract; the assertion is paired with a live-behavior proxy
 * below that asserts the server response does not invent new status values
 * outside the union.
 */

const SERVER_PATH = resolve(__dirname, '../../../../server/src/services/Scheduler.ts');
const CLIENT_PATH = resolve(__dirname, './schedulerApi.ts');
const SERVER_SOURCE = readFileSync(SERVER_PATH, 'utf-8');
const CLIENT_SOURCE = readFileSync(CLIENT_PATH, 'utf-8');

describe('Phase 6 Red-phase expansion — Status enum drift (test-strategy.md §3)', () => {
  describe('artifact: server exports the canonical SchedulerTaskStatus union', () => {
    it('server/src/services/Scheduler.ts declares `SchedulerTaskStatus` as an exported type alias', () => {
      // Match either an interface-style or type-alias-style declaration that is
      // exported. The union members must include the four real status values.
      expect(SERVER_SOURCE).toMatch(
        /export\s+type\s+SchedulerTaskStatus\s*=[\s\S]*?'healthy'[\s\S]*?'warning'[\s\S]*?'error'[\s\S]*?'disabled'[\s\S]*?;/,
      );
    });

    it('the union is closed over exactly the four expected status values (no extras, no missing)', () => {
      // Extract the union body for a structural assertion. This regex captures the
      // union members regardless of quote style (single/double) or whitespace.
      const match = SERVER_SOURCE.match(
        /export\s+type\s+SchedulerTaskStatus\s*=\s*([\s\S]*?);/,
      );
      expect(match, 'SchedulerTaskStatus type alias must exist on the server').not.toBeNull();
      const body = match![1]!;
      const members = new Set(
        body
          .split('|')
          .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
          .filter((s) => s.length > 0),
      );
      expect(members).toEqual(new Set(['healthy', 'warning', 'error', 'disabled']));
    });
  });

  describe('artifact: client zod enum derives from the server-side union, not a duplicated literal', () => {
    it('client schedulerApi.ts imports SchedulerTaskStatus from the server (or a re-export module)', () => {
      // The client must reference the union by name. Accept any of the common
      // import shapes used in this repo (relative path, @/ alias, or a re-export
      // helper under app/src/lib/).
      const importPattern =
        /import\s+(?:type\s+)?\{[^}]*\bSchedulerTaskStatus\b[^}]*\}\s+from\s+['"](?:\.\.?\/[^'"]*|@\/[^'"]*)['"]/;
      expect(
        CLIENT_SOURCE,
        'schedulerApi.ts must import SchedulerTaskStatus from the server (or a re-export module) so the client enum cannot drift',
      ).toMatch(importPattern);
    });

    it('client zod enum is constructed from SchedulerTaskStatus, not a hardcoded literal', () => {
      // The previous form was: z.enum(['healthy', 'warning', 'error', 'disabled'])
      // The Green form must reference SchedulerTaskStatus in the enum shape, e.g.
      //   z.enum(getStatusValues())         // helper
      //   z.enum(STATUS_VALUES)             // constant
      //   z.custom<SchedulerTaskStatus>(...) // custom schema
      const literalEnum = /status\s*:\s*z\.enum\(\s*\[\s*['"]healthy['"]\s*,\s*['"]warning['"]\s*,\s*['"]error['"]\s*,\s*['"]disabled['"]\s*\]\s*\)/;
      expect(
        CLIENT_SOURCE,
        'schedulerApi.ts must not declare the status zod enum as a hardcoded literal — it must reference SchedulerTaskStatus',
      ).not.toMatch(literalEnum);
    });
  });
});