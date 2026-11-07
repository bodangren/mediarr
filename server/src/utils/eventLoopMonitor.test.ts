import { afterEach, describe, expect, it } from 'vitest';
import {
  getEventLoopHealth,
  resetEventLoopHealth,
  startEventLoopMonitor,
  stopEventLoopMonitor,
} from './eventLoopMonitor';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('event-loop monitor', () => {
  afterEach(() => {
    stopEventLoopMonitor();
    resetEventLoopHealth();
  });

  it('reports a clean loop when nothing blocks', async () => {
    startEventLoopMonitor({ intervalMs: 20, warnThresholdMs: 500 });
    await sleep(80);
    const health = getEventLoopHealth();
    expect(health.samples).toBeGreaterThan(0);
    expect(health.stallCount).toBe(0);
  });

  it('detects a synchronous stall', async () => {
    const stalls: number[] = [];
    startEventLoopMonitor({
      intervalMs: 20,
      warnThresholdMs: 15,
      onStall: lag => stalls.push(lag),
    });
    await sleep(60);

    // Block the loop the way a cold better-sqlite3 query on a spun-down USB
    // drive does.
    const until = Date.now() + 120;
    while (Date.now() < until) {
      // busy
    }

    await sleep(90);
    const health = getEventLoopHealth();
    expect(health.maxLagMs).toBeGreaterThan(40);
    expect(health.stallCount).toBeGreaterThan(0);
    expect(stalls.length).toBeGreaterThan(0);
    expect(health.worstAt).not.toBeNull();
  });

  it('is idempotent, so repeated starts do not stack timers', async () => {
    startEventLoopMonitor({ intervalMs: 20, warnThresholdMs: 500 });
    startEventLoopMonitor({ intervalMs: 20, warnThresholdMs: 500 });
    await sleep(80);
    const health = getEventLoopHealth();
    // Two timers would produce roughly twice the samples in the same window.
    expect(health.samples).toBeLessThan(12);
  });
});
