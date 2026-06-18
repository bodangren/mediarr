import { http, HttpResponse } from 'msw';
import { numberQuery, sendPaginated, sendSuccess } from './helpers';

const MOCK_TASKS = [
  {
    id: 'rss-sync',
    taskName: 'RSS Sync',
    cronExpression: '*/15 * * * *',
    lastRunAt: '2026-06-18T12:00:00.000Z',
    lastDurationMs: 1234,
    nextRunAt: '2026-06-18T12:15:00.000Z',
    enabled: true,
    status: 'healthy',
  },
  {
    id: 'wanted-search',
    taskName: 'Wanted Search',
    cronExpression: '0 */6 * * *',
    lastRunAt: '2026-06-18T06:00:00.000Z',
    lastDurationMs: 5800,
    nextRunAt: '2026-06-18T12:00:00.000Z',
    enabled: true,
    status: 'warning',
  },
] as const;

const MOCK_HISTORY = [
  {
    id: 1,
    taskName: 'rss-sync',
    status: 'SUCCESS' as const,
    startedAt: '2026-06-18T12:00:00.000Z',
    completedAt: '2026-06-18T12:00:01.000Z',
    durationMs: 1000,
    errorMessage: null,
  },
  {
    id: 2,
    taskName: 'wanted-search',
    status: 'FAILED' as const,
    startedAt: '2026-06-18T06:00:00.000Z',
    completedAt: '2026-06-18T06:00:05.000Z',
    durationMs: 5000,
    errorMessage: 'Indexer timeout',
  },
];

export function createSchedulerHandlers() {
  return [
    http.get('/api/scheduler/tasks', () => {
      return sendSuccess([...MOCK_TASKS]);
    }),

    http.get('/api/scheduler/history', ({ request }) => {
      const url = new URL(request.url);
      const page = numberQuery(url, 'page', 1);
      const pageSize = numberQuery(url, 'pageSize', 25);
      return sendPaginated([...MOCK_HISTORY], page, pageSize);
    }),

    http.put('/api/scheduler/:taskId/interval', async ({ params, request }) => {
      const body = (await request.json()) as { cronExpression?: string };
      return sendSuccess({
        taskId: params.taskId as string,
        cronExpression: body.cronExpression ?? '*/15 * * * *',
      });
    }),

    http.post('/api/scheduler/:taskId/trigger', ({ params }) => {
      return sendSuccess({ taskId: params.taskId as string, executionId: 99 }, 202);
    }),

    http.put('/api/scheduler/:taskId/toggle', async ({ params, request }) => {
      const body = (await request.json()) as { enabled?: boolean };
      return sendSuccess({
        taskId: params.taskId as string,
        enabled: body.enabled ?? false,
      });
    }),
  ];
}
