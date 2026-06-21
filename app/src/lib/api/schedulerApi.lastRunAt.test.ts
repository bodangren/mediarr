import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ApiHttpClient } from './httpClient';
import { createSchedulerApi } from './schedulerApi';

/**
 * Phase 6 Task 4 — `lastRunAt` is nullable in the client schema.
 *
 * The 2026-06-21 completion audit found that `app/src/lib/api/schedulerApi.ts`
 * declared `lastRunAt: z.string()` (required, non-nullable), but the server's
 * `ScheduledJobMeta.lastRunAt: string | null` (`server/src/services/Scheduler.ts:9`)
 * is legitimately `null` for never-run tasks. The mismatch means the client would
 * either reject the legitimate null OR paper over the missing data with a
 * fabricated default (the same anti-pattern Task 3 fixes for `enabled`/`status`).
 *
 * The Green owner must:
 *   1. Change `lastRunAt` from `z.string()` to `z.string().nullable()` in the
 *      client zod schema.
 *   2. Make `lastDurationMs` and `nextRunAt` nullable for the same reason
 *      (server can legitimately return null for never-run tasks).
 *
 * This test pairs an artifact assertion (schema source contains
 * `lastRunAt: z.string().nullable()`) with a live-behavior assertion
 * (a server response with `lastRunAt: null` parses successfully to
 * `{ lastRunAt: null }`, NOT to a parse error).
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

describe('Phase 6 Task 4 — client schedulerTaskSchema accepts null for never-run task fields', () => {
  describe('schema source assertions (artifact)', () => {
    it('declares lastRunAt as z.string().nullable() (not the plain z.string() required form)', () => {
      // The field must be nullable. Match the full field declaration to avoid
      // false positives on unrelated `z.string()` calls.
      expect(SCHEMA_SOURCE).toMatch(/lastRunAt\s*:\s*z\.string\(\)\.nullable\(\)/);
    });

    it('declares lastDurationMs as z.number().nullable() (server can return null for never-run tasks)', () => {
      expect(SCHEMA_SOURCE).toMatch(/lastDurationMs\s*:\s*z\.number\(\)\.nullable\(\)/);
    });

    it('declares nextRunAt as z.string().nullable() (server can return null when cron is unsupported)', () => {
      expect(SCHEMA_SOURCE).toMatch(/nextRunAt\s*:\s*z\.string\(\)\.nullable\(\)/);
    });
  });

  describe('live-behavior assertion — null lastRunAt / lastDurationMs / nextRunAt parse without error', () => {
    it('parses a server response with all three never-run fields as null', async () => {
      const serverPayload = [
        {
          id: 'never-run',
          taskName: 'Never Run Task',
          cronExpression: '*/30 * * * *',
          lastRunAt: null,
          lastDurationMs: null,
          nextRunAt: null,
        },
      ];

      const client = new ApiHttpClient({ fetchFn: makeFetch(serverPayload) });
      const schedulerApi = createSchedulerApi(client);
      const parsed = await schedulerApi.listTasks();

      expect(parsed).toHaveLength(1);
      expect(parsed[0]!.lastRunAt).toBeNull();
      expect(parsed[0]!.lastDurationMs).toBeNull();
      expect(parsed[0]!.nextRunAt).toBeNull();
    });

    it('still parses a server response with real timestamp values (no regression on the happy path)', async () => {
      const serverPayload = [
        {
          id: 'rss-sync',
          taskName: 'RSS Sync',
          cronExpression: '*/15 * * * *',
          lastRunAt: '2026-06-18T12:00:00.000Z',
          lastDurationMs: 1234,
          nextRunAt: '2026-06-18T12:15:00.000Z',
        },
      ];

      const client = new ApiHttpClient({ fetchFn: makeFetch(serverPayload) });
      const schedulerApi = createSchedulerApi(client);
      const parsed = await schedulerApi.listTasks();

      expect(parsed[0]!.lastRunAt).toBe('2026-06-18T12:00:00.000Z');
      expect(parsed[0]!.lastDurationMs).toBe(1234);
      expect(parsed[0]!.nextRunAt).toBe('2026-06-18T12:15:00.000Z');
    });
  });
});