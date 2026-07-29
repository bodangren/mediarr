import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  SCHEDULER_TASK_STATUS_VALUES,
  type SchedulerTaskStatus,
} from '@server/contracts/scheduler';

const CONTRACT_PATH = resolve(
  __dirname,
  '../../../../server/src/contracts/scheduler.ts',
);
const SERVER_PATH = resolve(
  __dirname,
  '../../../../server/src/services/Scheduler.ts',
);
const CLIENT_PATH = resolve(__dirname, './schedulerApi.ts');

const CONTRACT_SOURCE = readFileSync(CONTRACT_PATH, 'utf-8');
const SERVER_SOURCE = readFileSync(SERVER_PATH, 'utf-8');
const CLIENT_SOURCE = readFileSync(CLIENT_PATH, 'utf-8');

const EXPECTED_STATUSES = [
  'healthy',
  'warning',
  'error',
  'disabled',
] as const satisfies readonly SchedulerTaskStatus[];

describe('scheduler task status browser/server contract', () => {
  it('keeps the runtime values closed over the four supported statuses', () => {
    expect(SCHEDULER_TASK_STATUS_VALUES).toEqual(EXPECTED_STATUSES);
  });

  it('keeps the shared contract dependency-neutral', () => {
    expect(CONTRACT_SOURCE).not.toMatch(
      /(?:from\s+['"][^'"]*(?:services\/Scheduler|node-cron)|require\(\s*['"]node-cron)/,
    );
  });

  it('has both the browser API client and server scheduler consume the shared contract', () => {
    expect(CLIENT_SOURCE).toMatch(
      /from\s+['"]@server\/contracts\/scheduler['"]/,
    );
    expect(SERVER_SOURCE).toMatch(
      /from\s+['"]\.\.\/contracts\/scheduler['"]/,
    );
  });

  it('never imports the scheduler service or node-cron into the browser API client', () => {
    expect(CLIENT_SOURCE).not.toMatch(/services\/Scheduler|node-cron/);
  });
});
