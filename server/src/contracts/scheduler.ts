/** Runtime values accepted by the scheduler task-status API contract. */
export const SCHEDULER_TASK_STATUS_VALUES = [
  'healthy',
  'warning',
  'error',
  'disabled',
] as const;

/** Closed scheduler task-status union shared by the server and browser. */
export type SchedulerTaskStatus =
  (typeof SCHEDULER_TASK_STATUS_VALUES)[number];
