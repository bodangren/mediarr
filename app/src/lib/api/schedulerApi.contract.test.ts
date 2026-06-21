import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ApiHttpClient } from './httpClient';
import { createSchedulerApi } from './schedulerApi';

/**
 * Phase 6 Task 3 — Real `enabled`/`status` fields from the server.
 *
 * The 2026-06-21 completion audit found that the GET /api/scheduler/tasks
 * response did NOT include `enabled` or `status` fields, but the client
 * zod schema in schedulerApi.ts applied fabricated defaults
 * (`.default(true)` and `.default('healthy')`) that hid the missing data.
 *
 * The Green owner must:
 *   1. Extend SchedulerJobMeta + GET /api/scheduler/tasks to emit real
 *      `enabled` + `status` fields (no defaults on the server side).
 *   2. Remove the `.default(...)` modifiers from the client zod schema so
 *      a missing field surfaces as `undefined` (and a missing field is
 *      detectable by the page + components instead of being papered over).
 *
 * This test pairs an artifact assertion (schema source contains no
 * `.default(true)` on enabled, no `.default('healthy')` on status) with
 * a live-behavior assertion (a server response that omits these fields
 * parses to objects with `enabled` / `status === undefined`, NOT to
 * fabricated truthy defaults). Per the user-instruction, "Artifact or
 * markdown assertions are allowed only when the phase deliverable is
 * that artifact, and they must be paired with a live-behavior proof" —
 * the live-behavior proof is the second describe block below.
 */

const SCHEMA_PATH = resolve(__dirname, './schedulerApi.ts');
const SCHEMA_SOURCE = readFileSync(SCHEMA_PATH, 'utf-8');

function makeFetch(payload: unknown, status = 200): typeof fetch {
  return (async () =>
    new Response(JSON.stringify({ ok: true, data: payload }), {
      status,
      headers: { 'content-type': 'application/json' },
    })) as unknown as typeof fetch;
}

describe('Phase 6 Task 3 — client schedulerTaskSchema has no fabricated defaults for enabled/status', () => {
  describe('schema source assertions (artifact)', () => {
    it('does NOT declare .default(true) on the enabled field', () => {
      // Match the enabled field declaration through the closing token (`,` or `}`)
      // to avoid false matches inside string literals.
      expect(SCHEMA_SOURCE).not.toMatch(/enabled\s*:\s*z\.boolean\(\)\.default\(true\)/);
    });

    it('does NOT declare .default(\'healthy\') (or any default) on the status field', () => {
      expect(SCHEMA_SOURCE).not.toMatch(/status\s*:\s*z\.enum\(\[.*?\]\)\.default\(/s);
    });

    it('the status field uses a closed zod enum (not z.string), with values derived from the server-side SchedulerTaskStatus union (test-strategy.md §3)', () => {
      // The status field must be a closed zod enum, not an open string that would silently
      // accept any garbage. The default must NOT be present (asserted above); here we
      // assert the closed-enum shape and that the client derives from the server-side
      // SchedulerTaskStatus union — the four real status values live in
      // `server/src/services/Scheduler.ts` (per the Status enum drift contract in
      // test-strategy.md §3) and the client must reference them by import, not duplicate
      // the literal list. Acceptable forms:
      //   - z.enum(['healthy', 'warning', 'error', 'disabled'])        (literal)
      //   - z.enum(SCHEDULER_TASK_STATUS_VALUES)                       (spec-aligned reference)
      //   - z.enum(getStatusValues())                                  (helper)
      // The companion test `schedulerApi.statusEnum.test.ts` enforces the
      // import-from-server contract (no duplicated literal + import of
      // SchedulerTaskStatus).
      expect(SCHEMA_SOURCE).toMatch(/status\s*:\s*z\.enum\(/);
      expect(SCHEMA_SOURCE).not.toMatch(/status\s*:\s*z\.string\(\)/);
    });
  });

  describe('live-behavior assertion — a server response omitting enabled/status parses to undefined, not to defaults', () => {
    it('parses a server response without enabled to { enabled: undefined, status: undefined }', async () => {
      const serverPayload = [
        {
          id: 'rss-sync',
          taskName: 'RSS Sync',
          cronExpression: '*/15 * * * *',
          // intentionally OMIT enabled and status to simulate a server that does
          // not yet emit them — the Green owner must fix both sides so these
          // values are real.
          lastRunAt: '2026-06-18T12:00:00.000Z',
          lastDurationMs: 1234,
          nextRunAt: '2026-06-18T12:15:00.000Z',
        },
      ];

      const client = new ApiHttpClient({ fetchFn: makeFetch(serverPayload) });
      const schedulerApi = createSchedulerApi(client);
      const parsed = await schedulerApi.listTasks();

      expect(parsed).toHaveLength(1);
      // Live behavior: missing fields must NOT be papered over by client defaults.
      // The Green owner must remove the .default(...) modifiers so the page can
      // detect the missing-data state and surface it instead of showing fake green badges.
      expect(parsed[0]!.enabled).toBeUndefined();
      expect(parsed[0]!.status).toBeUndefined();
    });

    it('parses a server response WITH explicit enabled=false and status="disabled" faithfully (no client override)', async () => {
      const serverPayload = [
        {
          id: 'rss-sync',
          taskName: 'RSS Sync',
          cronExpression: '*/15 * * * *',
          lastRunAt: null,
          lastDurationMs: null,
          nextRunAt: null,
          enabled: false,
          status: 'disabled',
        },
      ];

      const client = new ApiHttpClient({ fetchFn: makeFetch(serverPayload) });
      const schedulerApi = createSchedulerApi(client);
      const parsed = await schedulerApi.listTasks();

      expect(parsed[0]!.enabled).toBe(false);
      expect(parsed[0]!.status).toBe('disabled');
    });
  });
});