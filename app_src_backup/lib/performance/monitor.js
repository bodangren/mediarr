class PerformanceMonitor {
    metrics = new Map();
    activeMeasurements = new Map();
    isDevelopment = process.env.NODE_ENV === 'development';
    setDevelopmentMode(isDev) {
        this.isDevelopment = isDev;
    }
    start(metricName) {
        if (!this.isDevelopment)
            return;
        const startTime = performance.now();
        this.activeMeasurements.set(metricName, startTime);
    }
    stop(metricName, log = false) {
        if (!this.isDevelopment)
            return undefined;
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
        const metric = {
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
    async stopAsync(metricName, log = false) {
        return this.stop(metricName, log);
    }
    measureRender(componentName, renderFn) {
        const metricName = `render:${componentName}`;
        this.start(metricName);
        const result = renderFn();
        const metric = this.stop(metricName);
        return { result, metric };
    }
    async measureApiCall(apiEndpoint, apiCall) {
        const metricName = `api:${apiEndpoint}`;
        this.start(metricName);
        try {
            const result = await apiCall();
            const metric = this.stop(metricName);
            return { result, metric };
        }
        catch (error) {
            this.stop(metricName);
            throw error;
        }
    }
    getMetrics() {
        const allMetrics = [];
        for (const metrics of this.metrics.values()) {
            allMetrics.push(...metrics);
        }
        return allMetrics.sort((a, b) => b.timestamp - a.timestamp);
    }
    getMetricsByName(pattern) {
        const allMetrics = this.getMetrics();
        return allMetrics.filter(metric => metric.name.startsWith(pattern));
    }
    getStatistics(metricName) {
        const metrics = this.metrics.get(metricName);
        if (!metrics || metrics.length === 0)
            return undefined;
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
    getAverageDuration(metricName) {
        const stats = this.getStatistics(metricName);
        return stats?.average;
    }
    clearMetrics() {
        this.metrics.clear();
        this.activeMeasurements.clear();
    }
    clearMetric(metricName) {
        this.metrics.delete(metricName);
        this.activeMeasurements.delete(metricName);
    }
}
// Singleton instance
export const performanceMonitor = new PerformanceMonitor();
// Utility functions for easier use
export function startPerformanceMeasurement(metricName) {
    performanceMonitor.start(metricName);
}
export function stopPerformanceMeasurement(metricName, log = false) {
    return performanceMonitor.stop(metricName, log);
}
export function measureComponentRender(componentName, renderFn) {
    return performanceMonitor.measureRender(componentName, renderFn);
}
export async function measureApiCall(apiEndpoint, apiCall) {
    return performanceMonitor.measureApiCall(apiEndpoint, apiCall);
}
export function getPerformanceMetrics() {
    return performanceMonitor.getMetrics();
}
export function getPerformanceStatistics(metricName) {
    return performanceMonitor.getStatistics(metricName);
}
export function clearPerformanceMetrics() {
    performanceMonitor.clearMetrics();
}
//# sourceMappingURL=monitor.js.map