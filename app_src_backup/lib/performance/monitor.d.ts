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
declare class PerformanceMonitor {
    private metrics;
    private activeMeasurements;
    private isDevelopment;
    setDevelopmentMode(isDev: boolean): void;
    start(metricName: string): void;
    stop(metricName: string, log?: boolean): PerformanceMetric | undefined;
    stopAsync(metricName: string, log?: boolean): Promise<PerformanceMetric | undefined>;
    measureRender<T>(componentName: string, renderFn: () => T): {
        result: T;
        metric: PerformanceMetric | undefined;
    };
    measureApiCall<T>(apiEndpoint: string, apiCall: () => Promise<T>): Promise<{
        result: T;
        metric: PerformanceMetric | undefined;
    }>;
    getMetrics(): PerformanceMetric[];
    getMetricsByName(pattern: string): PerformanceMetric[];
    getStatistics(metricName: string): PerformanceStatistics | undefined;
    getAverageDuration(metricName: string): number | undefined;
    clearMetrics(): void;
    clearMetric(metricName: string): void;
}
export declare const performanceMonitor: PerformanceMonitor;
export declare function startPerformanceMeasurement(metricName: string): void;
export declare function stopPerformanceMeasurement(metricName: string, log?: boolean): PerformanceMetric | undefined;
export declare function measureComponentRender<T>(componentName: string, renderFn: () => T): {
    result: T;
    metric: PerformanceMetric | undefined;
};
export declare function measureApiCall<T>(apiEndpoint: string, apiCall: () => Promise<T>): Promise<{
    result: T;
    metric: PerformanceMetric | undefined;
}>;
export declare function getPerformanceMetrics(): PerformanceMetric[];
export declare function getPerformanceStatistics(metricName: string): PerformanceStatistics | undefined;
export declare function clearPerformanceMetrics(): void;
export {};
//# sourceMappingURL=monitor.d.ts.map