export interface PerformanceMetric {
  name: string;
  duration: number;
  startTime: number;
  endTime?: number;
  timestamp: number;
}

export interface PerformanceStatistics {
  count: number;
  min: number;
  max: number;
  average: number;
  total: number;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private activeMeasurements: Map<string, number> = new Map();
  private isDevelopment = import.meta.env.DEV;

  setDevelopmentMode(isDev: boolean): void {
    this.isDevelopment = isDev;
  }

  start(metricName: string): void {
    if (!this.isDevelopment) return;

    const startTime = performance.now();
    this.activeMeasurements.set(metricName, startTime);
  }

  stop(metricName: string, log: boolean = false): PerformanceMetric | undefined {
    if (!this.isDevelopment) return undefined;

    const startTime = this.activeMeasurements.get(metricName);
    if (startTime === undefined) {
      if (this.isDevelopment) {
        console.warn(`Performance measurement for "${metricName}" was not started`);
      }
      return undefined;
    }

    const endTime = performance.now();
    const duration = endTime - startTime;
    const timestamp = Date.now();

    const metric: PerformanceMetric = {
      name: metricName,
      duration,
      startTime,
      endTime,
      timestamp,
    };

    // Store the metric
    const existingMetrics = this.metrics.get(metricName) || [];
    existingMetrics.push(metric);
    this.metrics.set(metricName, existingMetrics);

    // Clean up active measurement
    this.activeMeasurements.delete(metricName);

    // Log if requested
    if (log && this.isDevelopment) {
      console.log(`[Performance] ${metricName}: ${duration.toFixed(2)}ms`);
    }

    return metric;
  }

  async stopAsync(metricName: string, log: boolean = false): Promise<PerformanceMetric | undefined> {
    return this.stop(metricName, log);
  }

  measureRender<T>(componentName: string, renderFn: () => T): { result: T; metric: PerformanceMetric | undefined } {
    const metricName = `render:${componentName}`;
    this.start(metricName);
    const result = renderFn();
    const metric = this.stop(metricName);
    return { result, metric };
  }

  async measureApiCall<T>(apiEndpoint: string, apiCall: () => Promise<T>): Promise<{ result: T; metric: PerformanceMetric | undefined }> {
    const metricName = `api:${apiEndpoint}`;
    this.start(metricName);
    try {
      const result = await apiCall();
      const metric = this.stop(metricName);
      return { result, metric };
    } catch (error) {
      this.stop(metricName);
      throw error;
    }
  }

  getMetrics(): PerformanceMetric[] {
    const allMetrics: PerformanceMetric[] = [];
    for (const metrics of this.metrics.values()) {
      allMetrics.push(...metrics);
    }
    return allMetrics.sort((a, b) => b.timestamp - a.timestamp);
  }

  getMetricsByName(pattern: string): PerformanceMetric[] {
    const allMetrics = this.getMetrics();
    return allMetrics.filter(metric => metric.name.startsWith(pattern));
  }

  getStatistics(metricName: string): PerformanceStatistics | undefined {
    const metrics = this.metrics.get(metricName);
    if (!metrics || metrics.length === 0) return undefined;

    const durations = metrics.map(m => m.duration);
    const min = Math.min(...durations);
    const max = Math.max(...durations);
    const total = durations.reduce((sum, d) => sum + d, 0);
    const average = total / durations.length;

    return {
      count: metrics.length,
      min,
      max,
      average,
      total,
    };
  }

  getAverageDuration(metricName: string): number | undefined {
    const stats = this.getStatistics(metricName);
    return stats?.average;
  }

  clearMetrics(): void {
    this.metrics.clear();
    this.activeMeasurements.clear();
  }

  clearMetric(metricName: string): void {
    this.metrics.delete(metricName);
    this.activeMeasurements.delete(metricName);
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Utility functions for easier use
export function startPerformanceMeasurement(metricName: string): void {
  performanceMonitor.start(metricName);
}

export function stopPerformanceMeasurement(metricName: string, log: boolean = false): PerformanceMetric | undefined {
  return performanceMonitor.stop(metricName, log);
}

export function measureComponentRender<T>(componentName: string, renderFn: () => T): { result: T; metric: PerformanceMetric | undefined } {
  return performanceMonitor.measureRender(componentName, renderFn);
}

export async function measureApiCall<T>(apiEndpoint: string, apiCall: () => Promise<T>): Promise<{ result: T; metric: PerformanceMetric | undefined }> {
  return performanceMonitor.measureApiCall(apiEndpoint, apiCall);
}

export function getPerformanceMetrics(): PerformanceMetric[] {
  return performanceMonitor.getMetrics();
}

export function getPerformanceStatistics(metricName: string): PerformanceStatistics | undefined {
  return performanceMonitor.getStatistics(metricName);
}

export function clearPerformanceMetrics(): void {
  performanceMonitor.clearMetrics();
}
