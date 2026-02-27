import { describe, expect, it, vi, beforeEach } from 'vitest';
import { performanceMonitor, type PerformanceMetric } from './monitor';

describe('Performance Monitor', () => {
  beforeEach(() => {
    // Clear all metrics before each test
    performanceMonitor.clearMetrics();
    // Set development mode for testing
    (performanceMonitor as any).setDevelopmentMode(true);
  });

  it('starts and stops a performance measurement', () => {
    const metricName = 'test-metric';

    performanceMonitor.start(metricName);

    // Perform some work
    let sum = 0;
    for (let i = 0; i < 1000; i++) {
      sum += i;
    }

    const metric = performanceMonitor.stop(metricName);

    expect(metric).toBeDefined();
    expect(metric?.name).toBe(metricName);
    expect(metric?.duration).toBeGreaterThan(0);
    expect(metric?.startTime).toBeLessThan(metric?.endTime!);
  });

  it('measures async operations', async () => {
    const metricName = 'async-metric';

    performanceMonitor.start(metricName);

    // Simulate async work
    await new Promise(resolve => setTimeout(resolve, 10));

    const metric = await performanceMonitor.stopAsync(metricName);

    expect(metric).toBeDefined();
    expect(metric?.name).toBe(metricName);
    expect(metric?.duration).toBeGreaterThanOrEqual(10);
  });

  it('logs metrics in development mode', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const metricName = 'test-metric';

    performanceMonitor.start(metricName);
    const metric = performanceMonitor.stop(metricName, true);

    expect(consoleSpy).toHaveBeenCalled();
    expect(metric).toBeDefined();

    consoleSpy.mockRestore();
  });

  it('does not log metrics in production mode', () => {
    (performanceMonitor as any).setDevelopmentMode(false);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const metricName = 'test-metric';

    performanceMonitor.start(metricName);
    const metric = performanceMonitor.stop(metricName, true);

    expect(consoleSpy).not.toHaveBeenCalled();
    expect(metric).toBeUndefined(); // In production mode, should return undefined

    consoleSpy.mockRestore();
    // Reset to development mode for other tests
    (performanceMonitor as any).setDevelopmentMode(true);
  });

  it('measures component render time', () => {
    const componentName = 'TestComponent';
    const renderFn = () => {
      // Simulate component rendering work
      let result = 0;
      for (let i = 0; i < 10000; i++) {
        result += i;
      }
      return result;
    };

    const { result, metric } = performanceMonitor.measureRender(componentName, renderFn);

    expect(result).toBe(49995000); // Sum of 0-9999
    expect(metric).toBeDefined();
    expect(metric?.name).toBe(`render:${componentName}`);
    expect(metric?.duration).toBeGreaterThan(0);
  });

  it('measures API call performance', async () => {
    const apiEndpoint = '/api/test';
    const apiCall = async () => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 10));
      return { data: 'test' };
    };

    const { result, metric } = await performanceMonitor.measureApiCall(apiEndpoint, apiCall);

    expect(result).toEqual({ data: 'test' });
    expect(metric).toBeDefined();
    expect(metric?.name).toBe(`api:${apiEndpoint}`);
    expect(metric?.duration).toBeGreaterThanOrEqual(10);
  });

  it('stores and retrieves all metrics', () => {
    const metricName1 = 'metric-1';
    const metricName2 = 'metric-2';

    performanceMonitor.start(metricName1);
    performanceMonitor.stop(metricName1);

    performanceMonitor.start(metricName2);
    performanceMonitor.stop(metricName2);

    const metrics = performanceMonitor.getMetrics();

    expect(metrics).toHaveLength(2);
    expect(metrics[0].name).toBe(metricName1);
    expect(metrics[1].name).toBe(metricName2);
  });

  it('gets metrics by name pattern', () => {
    const metricName1 = 'api:/api/users';
    const metricName2 = 'api:/api/posts';
    const metricName3 = 'render:TestComponent';

    performanceMonitor.start(metricName1);
    performanceMonitor.stop(metricName1);

    performanceMonitor.start(metricName2);
    performanceMonitor.stop(metricName2);

    performanceMonitor.start(metricName3);
    performanceMonitor.stop(metricName3);

    const apiMetrics = performanceMonitor.getMetricsByName('api:');

    expect(apiMetrics).toHaveLength(2);
    expect(apiMetrics.every(m => m.name.startsWith('api:'))).toBe(true);
  });

  it('calculates average duration for metrics', () => {
    const metricName = 'test-metric';

    // Measure multiple times
    for (let i = 0; i < 5; i++) {
      performanceMonitor.start(metricName);
      performanceMonitor.stop(metricName);
    }

    const avg = performanceMonitor.getAverageDuration(metricName);

    expect(avg).toBeGreaterThan(0);
    expect(avg).toBeLessThan(1000); // Should be fast
  });

  it('clears all metrics', () => {
    const metricName = 'test-metric';

    performanceMonitor.start(metricName);
    performanceMonitor.stop(metricName);

    expect(performanceMonitor.getMetrics()).toHaveLength(1);

    performanceMonitor.clearMetrics();

    expect(performanceMonitor.getMetrics()).toHaveLength(0);
  });

  it('handles stopping a non-existent metric gracefully', () => {
    const metric = performanceMonitor.stop('non-existent');

    expect(metric).toBeUndefined();
  });

  it('handles multiple concurrent measurements', () => {
    const metric1 = 'metric-1';
    const metric2 = 'metric-2';
    const metric3 = 'metric-3';

    performanceMonitor.start(metric1);
    performanceMonitor.start(metric2);
    performanceMonitor.start(metric3);

    // Stop in reverse order
    const m3 = performanceMonitor.stop(metric3);
    const m2 = performanceMonitor.stop(metric2);
    const m1 = performanceMonitor.stop(metric1);

    expect(m1).toBeDefined();
    expect(m2).toBeDefined();
    expect(m3).toBeDefined();

    expect(m1?.duration).toBeGreaterThan(m3?.duration!);
  });

  it('tracks metrics statistics', () => {
    const metricName = 'test-metric';

    // Measure multiple times to get statistics
    for (let i = 0; i < 10; i++) {
      performanceMonitor.start(metricName);
      // Vary the work slightly
      const iterations = 1000 + i * 100;
      for (let j = 0; j < iterations; j++) {
        Math.random();
      }
      performanceMonitor.stop(metricName);
    }

    const stats = performanceMonitor.getStatistics(metricName);

    expect(stats).toBeDefined();
    expect(stats?.count).toBe(10);
    expect(stats?.min).toBeGreaterThan(0);
    expect(stats?.max).toBeGreaterThanOrEqual(stats?.min!);
    expect(stats?.average).toBeGreaterThan(0);
  });

  it('returns undefined for statistics on non-existent metric', () => {
    const stats = performanceMonitor.getStatistics('non-existent');

    expect(stats).toBeUndefined();
  });
});
