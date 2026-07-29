import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
import { routeMap } from './routeMap';
import {
  SCHEDULER_TASK_STATUS_VALUES,
  type SchedulerTaskStatus,
} from '@server/contracts/scheduler';

export type { SchedulerTaskStatus };
export { SCHEDULER_TASK_STATUS_VALUES };

const schedulerTaskSchema = z.object({
  id: z.string(),
  taskName: z.string(),
  cronExpression: z.string(),
  lastRunAt: z.string().nullable(),
  lastDurationMs: z.number().nullable(),
  nextRunAt: z.string().nullable(),
  enabled: z.boolean().optional(),
  status: z.enum(SCHEDULER_TASK_STATUS_VALUES).optional(),
});

const taskExecutionSchema = z.object({
  id: z.number(),
  taskName: z.string(),
  status: z.enum(['SUCCESS', 'FAILED', 'RUNNING']),
  startedAt: z.string(),
  completedAt: z.string(),
  durationMs: z.number(),
  errorMessage: z.string().nullable(),
});

const historyMetaSchema = z.object({
  page: z.number(),
  pageSize: z.number(),
  totalCount: z.number(),
  totalPages: z.number(),
});

export type SchedulerTask = z.infer<typeof schedulerTaskSchema>;

export function createSchedulerApi(client: ApiHttpClient) {
  return {
    listTasks(): Promise<SchedulerTask[]> {
      return client.request({ path: routeMap.schedulerTasks }, z.array(schedulerTaskSchema));
    },

    runTask(taskId: string): Promise<{ taskId: string; executionId: number }> {
      return client.request(
        { path: routeMap.schedulerTrigger(taskId), method: 'POST' },
        z.object({ taskId: z.string(), executionId: z.number() }),
      );
    },

    updateInterval(
      taskId: string,
      cronExpression: string,
    ): Promise<{ taskId: string; cronExpression: string }> {
      return client.request(
        {
          path: routeMap.schedulerInterval(taskId),
          method: 'PUT',
          body: { cronExpression },
        },
        z.object({ taskId: z.string(), cronExpression: z.string() }),
      );
    },

    getHistory(query?: {
      page?: number;
      pageSize?: number;
      fromDate?: string;
      toDate?: string;
    }): Promise<{ items: z.infer<typeof taskExecutionSchema>[]; meta: z.infer<typeof historyMetaSchema> }> {
      return client.request(
        { path: routeMap.schedulerHistory, query },
        z.object({ items: z.array(taskExecutionSchema), meta: historyMetaSchema }),
      );
    },

    toggleEnabled(
      taskId: string,
      enabled: boolean,
    ): Promise<{ taskId: string; enabled: boolean }> {
      return client.request(
        {
          path: routeMap.schedulerEnabled(taskId),
          method: 'PUT',
          body: { enabled },
        },
        z.object({ taskId: z.string(), enabled: z.boolean() }),
      );
    },
  };
}
