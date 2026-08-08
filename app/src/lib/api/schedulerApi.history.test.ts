import { describe, expect, it } from 'vitest';
import { ApiHttpClient } from './httpClient';
import { createSchedulerApi } from './schedulerApi';

function paginatedHistoryFetch(): typeof fetch {
  return (async () => new Response(JSON.stringify({
    ok: true,
    data: [{
      id: 42,
      taskName: 'rss-sync',
      status: 'SUCCESS',
      startedAt: '2026-07-29T12:00:00.000Z',
      completedAt: '2026-07-29T12:00:01.000Z',
      durationMs: 1000,
      errorMessage: null,
    }],
    meta: { page: 1, pageSize: 25, totalCount: 1, totalPages: 1 },
  }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })) as unknown as typeof fetch;
}

describe('scheduler history API contract', () => {
  it('parses the production paginated scheduler history envelope', async () => {
    const api = createSchedulerApi(new ApiHttpClient({ fetchFn: paginatedHistoryFetch() }));

    await expect(api.getHistory({ page: 1, pageSize: 25 })).resolves.toEqual({
      items: [expect.objectContaining({
        id: 42,
        taskName: 'rss-sync',
        status: 'SUCCESS',
        durationMs: 1000,
      })],
      meta: { page: 1, pageSize: 25, totalCount: 1, totalPages: 1 },
    });
  });
});
