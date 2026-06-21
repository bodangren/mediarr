import { describe, expect, it } from 'vitest';
import { runHandler } from '../handlers.test-helpers';

/**
 * Phase 6 Task 5 — MSW `/toggle` handler mirrors a real Fastify route.
 *
 * The 2026-06-21 completion audit found that the MSW handler at
 * `app/src/lib/msw/handlers/scheduler.ts:73-79` is a fabricated success path:
 *   - echoes the request body with no validation
 *   - returns 200 for empty / missing / non-boolean `enabled` (should be 422)
 *   - returns 200 for unknown taskIds (should be 404)
 *   - has no persistence, so a "toggle off" then "toggle on" returns
 *     inconsistent state
 *
 * The Green owner must rewrite the handler so it mirrors the real Fastify
 * `PUT /api/scheduler/:taskId/toggle` route (added by Task 1 of this phase):
 *   - 422 for missing / non-boolean `enabled`
 *   - 404 for unknown taskId with `{ ok: false, error: { code: 'NOT_FOUND' } }`
 *   - 200 with `{ taskId, enabled, status: 'disabled' }` when enabled=false
 *     (mirroring the server's persisted-state response from Task 3)
 *   - persistence: a "toggle off" call changes the in-memory state so the
 *     next GET /api/scheduler/tasks reflects `enabled: false` and
 *     `status: 'disabled'`
 *
 * This test runs through the real MSW handler chain via `runHandler` (no fake
 * mode, no full-suite smoke). The `runHandler` helper is shared by the
 * existing Phase S1-S6 MSW coverage tests.
 */

interface ToggleEnvelope {
  ok?: boolean;
  data?: { taskId?: string; enabled?: boolean; status?: string };
  error?: { code?: string; message?: string; retryable?: boolean };
}

async function readJson(response: Response): Promise<ToggleEnvelope> {
  return (await response.json()) as ToggleEnvelope;
}

describe('Phase 6 Task 5 — MSW /api/scheduler/:taskId/toggle handler mirrors a real Fastify route', () => {
  it('returns 422 with a VALIDATION_ERROR envelope when the body omits the enabled field', async () => {
    const response = await runHandler('PUT', 'http://localhost/api/scheduler/rss-sync/toggle', {});
    expect(response.status).toBe(422);
    const body = await readJson(response);
    expect(body.ok).toBe(false);
    expect(body.error?.code).toBe('VALIDATION_ERROR');
    expect(body.error?.retryable).toBe(false);
  });

  it('returns 422 with a VALIDATION_ERROR envelope when enabled is not a boolean', async () => {
    const response = await runHandler(
      'PUT',
      'http://localhost/api/scheduler/rss-sync/toggle',
      { enabled: 'not-a-boolean' },
    );
    expect(response.status).toBe(422);
    const body = await readJson(response);
    expect(body.ok).toBe(false);
    expect(body.error?.code).toBe('VALIDATION_ERROR');
  });

  it('returns 404 with a NOT_FOUND envelope for an unknown taskId (no fabricated success)', async () => {
    const response = await runHandler(
      'PUT',
      'http://localhost/api/scheduler/never-registered/toggle',
      { enabled: true },
    );
    expect(response.status).toBe(404);
    const body = await readJson(response);
    expect(body.ok).toBe(false);
    expect(body.error?.code).toBe('NOT_FOUND');
    expect(body.error?.retryable).toBe(false);
  });

  it('returns 200 with { taskId, enabled: false, status: \'disabled\' } when toggling a known task off', async () => {
    const response = await runHandler(
      'PUT',
      'http://localhost/api/scheduler/rss-sync/toggle',
      { enabled: false },
    );
    expect(response.status).toBe(200);
    const body = await readJson(response);
    expect(body.ok).toBe(true);
    expect(body.data?.taskId).toBe('rss-sync');
    expect(body.data?.enabled).toBe(false);
    expect(body.data?.status).toBe('disabled');
  });

  it('returns 200 with { taskId, enabled: true, status: \'healthy\' } when toggling a known task on', async () => {
    const response = await runHandler(
      'PUT',
      'http://localhost/api/scheduler/rss-sync/toggle',
      { enabled: true },
    );
    expect(response.status).toBe(200);
    const body = await readJson(response);
    expect(body.ok).toBe(true);
    expect(body.data?.taskId).toBe('rss-sync');
    expect(body.data?.enabled).toBe(true);
    // Status is whatever the GET /api/scheduler/tasks handler would derive for this
    // task — for a healthy cron task, that is 'healthy'. The Green owner chooses
    // the exact emission; this test only asserts the value is one of the four
    // status variants the Task 3 enum allows.
    expect(['healthy', 'warning', 'error']).toContain(body.data?.status);
  });
});