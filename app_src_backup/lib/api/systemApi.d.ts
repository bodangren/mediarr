import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
declare const healthStatusSchema: z.ZodEnum<["ok", "warning", "error", "unknown"]>;
declare const healthCheckSchema: z.ZodObject<{
    type: z.ZodString;
    source: z.ZodString;
    message: z.ZodString;
    status: z.ZodEnum<["ok", "warning", "error", "unknown"]>;
    lastChecked: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: string;
    status: "error" | "ok" | "unknown" | "warning";
    source: string;
    message: string;
    lastChecked?: string | undefined;
}, {
    type: string;
    status: "error" | "ok" | "unknown" | "warning";
    source: string;
    message: string;
    lastChecked?: string | undefined;
}>;
declare const systemInfoSchema: z.ZodObject<{
    version: z.ZodString;
    branch: z.ZodString;
    commit: z.ZodString;
    startTime: z.ZodString;
    uptime: z.ZodNumber;
    dotNetVersion: z.ZodOptional<z.ZodString>;
    os: z.ZodString;
    osVersion: z.ZodOptional<z.ZodString>;
    isMono: z.ZodOptional<z.ZodBoolean>;
    isLinux: z.ZodOptional<z.ZodBoolean>;
    isWindows: z.ZodOptional<z.ZodBoolean>;
    isDocker: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    version: string;
    commit: string;
    branch: string;
    startTime: string;
    uptime: number;
    os: string;
    dotNetVersion?: string | undefined;
    osVersion?: string | undefined;
    isMono?: boolean | undefined;
    isLinux?: boolean | undefined;
    isWindows?: boolean | undefined;
    isDocker?: boolean | undefined;
}, {
    version: string;
    commit: string;
    branch: string;
    startTime: string;
    uptime: number;
    os: string;
    dotNetVersion?: string | undefined;
    osVersion?: string | undefined;
    isMono?: boolean | undefined;
    isLinux?: boolean | undefined;
    isWindows?: boolean | undefined;
    isDocker?: boolean | undefined;
}>;
declare const databaseInfoSchema: z.ZodObject<{
    type: z.ZodString;
    version: z.ZodString;
    migration: z.ZodString;
    location: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: string;
    version: string;
    location: string;
    migration: string;
}, {
    type: string;
    version: string;
    location: string;
    migration: string;
}>;
declare const diskSpaceSchema: z.ZodObject<{
    path: z.ZodString;
    label: z.ZodString;
    free: z.ZodNumber;
    total: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    label: string;
    path: string;
    total: number;
    free: number;
}, {
    label: string;
    path: string;
    total: number;
    free: number;
}>;
declare const systemStatusSchema: z.ZodObject<{
    health: z.ZodObject<{
        overall: z.ZodEnum<["ok", "warning", "error", "unknown"]>;
        checks: z.ZodArray<z.ZodObject<{
            type: z.ZodString;
            source: z.ZodString;
            message: z.ZodString;
            status: z.ZodEnum<["ok", "warning", "error", "unknown"]>;
            lastChecked: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            type: string;
            status: "error" | "ok" | "unknown" | "warning";
            source: string;
            message: string;
            lastChecked?: string | undefined;
        }, {
            type: string;
            status: "error" | "ok" | "unknown" | "warning";
            source: string;
            message: string;
            lastChecked?: string | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        overall: "error" | "ok" | "unknown" | "warning";
        checks: {
            type: string;
            status: "error" | "ok" | "unknown" | "warning";
            source: string;
            message: string;
            lastChecked?: string | undefined;
        }[];
    }, {
        overall: "error" | "ok" | "unknown" | "warning";
        checks: {
            type: string;
            status: "error" | "ok" | "unknown" | "warning";
            source: string;
            message: string;
            lastChecked?: string | undefined;
        }[];
    }>;
    system: z.ZodObject<{
        version: z.ZodString;
        branch: z.ZodString;
        commit: z.ZodString;
        startTime: z.ZodString;
        uptime: z.ZodNumber;
        dotNetVersion: z.ZodOptional<z.ZodString>;
        os: z.ZodString;
        osVersion: z.ZodOptional<z.ZodString>;
        isMono: z.ZodOptional<z.ZodBoolean>;
        isLinux: z.ZodOptional<z.ZodBoolean>;
        isWindows: z.ZodOptional<z.ZodBoolean>;
        isDocker: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        version: string;
        commit: string;
        branch: string;
        startTime: string;
        uptime: number;
        os: string;
        dotNetVersion?: string | undefined;
        osVersion?: string | undefined;
        isMono?: boolean | undefined;
        isLinux?: boolean | undefined;
        isWindows?: boolean | undefined;
        isDocker?: boolean | undefined;
    }, {
        version: string;
        commit: string;
        branch: string;
        startTime: string;
        uptime: number;
        os: string;
        dotNetVersion?: string | undefined;
        osVersion?: string | undefined;
        isMono?: boolean | undefined;
        isLinux?: boolean | undefined;
        isWindows?: boolean | undefined;
        isDocker?: boolean | undefined;
    }>;
    database: z.ZodObject<{
        type: z.ZodString;
        version: z.ZodString;
        migration: z.ZodString;
        location: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: string;
        version: string;
        location: string;
        migration: string;
    }, {
        type: string;
        version: string;
        location: string;
        migration: string;
    }>;
    diskSpace: z.ZodArray<z.ZodObject<{
        path: z.ZodString;
        label: z.ZodString;
        free: z.ZodNumber;
        total: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        label: string;
        path: string;
        total: number;
        free: number;
    }, {
        label: string;
        path: string;
        total: number;
        free: number;
    }>, "many">;
    dependencies: z.ZodObject<{
        required: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            version: z.ZodString;
            status: z.ZodEnum<["ok", "warning", "error", "unknown"]>;
        }, "strip", z.ZodTypeAny, {
            status: "error" | "ok" | "unknown" | "warning";
            name: string;
            version: string;
        }, {
            status: "error" | "ok" | "unknown" | "warning";
            name: string;
            version: string;
        }>, "many">;
        optional: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            version: z.ZodOptional<z.ZodString>;
            status: z.ZodEnum<["ok", "warning", "error", "unknown"]>;
            reason: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            status: "error" | "ok" | "unknown" | "warning";
            name: string;
            version?: string | undefined;
            reason?: string | undefined;
        }, {
            status: "error" | "ok" | "unknown" | "warning";
            name: string;
            version?: string | undefined;
            reason?: string | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        required: {
            status: "error" | "ok" | "unknown" | "warning";
            name: string;
            version: string;
        }[];
        optional: {
            status: "error" | "ok" | "unknown" | "warning";
            name: string;
            version?: string | undefined;
            reason?: string | undefined;
        }[];
    }, {
        required: {
            status: "error" | "ok" | "unknown" | "warning";
            name: string;
            version: string;
        }[];
        optional: {
            status: "error" | "ok" | "unknown" | "warning";
            name: string;
            version?: string | undefined;
            reason?: string | undefined;
        }[];
    }>;
}, "strip", z.ZodTypeAny, {
    diskSpace: {
        label: string;
        path: string;
        total: number;
        free: number;
    }[];
    health: {
        overall: "error" | "ok" | "unknown" | "warning";
        checks: {
            type: string;
            status: "error" | "ok" | "unknown" | "warning";
            source: string;
            message: string;
            lastChecked?: string | undefined;
        }[];
    };
    database: {
        type: string;
        version: string;
        location: string;
        migration: string;
    };
    system: {
        version: string;
        commit: string;
        branch: string;
        startTime: string;
        uptime: number;
        os: string;
        dotNetVersion?: string | undefined;
        osVersion?: string | undefined;
        isMono?: boolean | undefined;
        isLinux?: boolean | undefined;
        isWindows?: boolean | undefined;
        isDocker?: boolean | undefined;
    };
    dependencies: {
        required: {
            status: "error" | "ok" | "unknown" | "warning";
            name: string;
            version: string;
        }[];
        optional: {
            status: "error" | "ok" | "unknown" | "warning";
            name: string;
            version?: string | undefined;
            reason?: string | undefined;
        }[];
    };
}, {
    diskSpace: {
        label: string;
        path: string;
        total: number;
        free: number;
    }[];
    health: {
        overall: "error" | "ok" | "unknown" | "warning";
        checks: {
            type: string;
            status: "error" | "ok" | "unknown" | "warning";
            source: string;
            message: string;
            lastChecked?: string | undefined;
        }[];
    };
    database: {
        type: string;
        version: string;
        location: string;
        migration: string;
    };
    system: {
        version: string;
        commit: string;
        branch: string;
        startTime: string;
        uptime: number;
        os: string;
        dotNetVersion?: string | undefined;
        osVersion?: string | undefined;
        isMono?: boolean | undefined;
        isLinux?: boolean | undefined;
        isWindows?: boolean | undefined;
        isDocker?: boolean | undefined;
    };
    dependencies: {
        required: {
            status: "error" | "ok" | "unknown" | "warning";
            name: string;
            version: string;
        }[];
        optional: {
            status: "error" | "ok" | "unknown" | "warning";
            name: string;
            version?: string | undefined;
            reason?: string | undefined;
        }[];
    };
}>;
declare const healthSnapshotSchema: z.ZodObject<{
    status: z.ZodEnum<["ok", "warning", "error", "unknown"]>;
    indexers: z.ZodArray<z.ZodObject<{
        indexerId: z.ZodNumber;
        indexerName: z.ZodString;
        severity: z.ZodEnum<["ok", "warning", "error", "unknown"]>;
        snapshot: z.ZodOptional<z.ZodNullable<z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        indexerId: number;
        indexerName: string;
        severity: "error" | "ok" | "unknown" | "warning";
        snapshot?: unknown;
    }, {
        indexerId: number;
        indexerName: string;
        severity: "error" | "ok" | "unknown" | "warning";
        snapshot?: unknown;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    status: "error" | "ok" | "unknown" | "warning";
    indexers: {
        indexerId: number;
        indexerName: string;
        severity: "error" | "ok" | "unknown" | "warning";
        snapshot?: unknown;
    }[];
}, {
    status: "error" | "ok" | "unknown" | "warning";
    indexers: {
        indexerId: number;
        indexerName: string;
        severity: "error" | "ok" | "unknown" | "warning";
        snapshot?: unknown;
    }[];
}>;
declare const scheduledTaskSchema: z.ZodObject<{
    id: z.ZodUnion<[z.ZodString, z.ZodNumber]>;
    taskName: z.ZodString;
    interval: z.ZodString;
    lastExecution: z.ZodNullable<z.ZodString>;
    lastDuration: z.ZodNullable<z.ZodNumber>;
    nextExecution: z.ZodString;
    status: z.ZodUnion<[z.ZodLiteral<"pending">, z.ZodLiteral<"running">, z.ZodLiteral<"completed">, z.ZodLiteral<"failed">]>;
}, "strip", z.ZodTypeAny, {
    status: "pending" | "completed" | "failed" | "running";
    id: string | number;
    interval: string;
    taskName: string;
    lastExecution: string | null;
    lastDuration: number | null;
    nextExecution: string;
}, {
    status: "pending" | "completed" | "failed" | "running";
    id: string | number;
    interval: string;
    taskName: string;
    lastExecution: string | null;
    lastDuration: number | null;
    nextExecution: string;
}>;
declare const queuedTaskSchema: z.ZodObject<{
    id: z.ZodUnion<[z.ZodString, z.ZodNumber]>;
    taskName: z.ZodString;
    started: z.ZodString;
    duration: z.ZodNullable<z.ZodNumber>;
    progress: z.ZodNumber;
    status: z.ZodUnion<[z.ZodLiteral<"running">, z.ZodLiteral<"queued">, z.ZodLiteral<"paused">]>;
}, "strip", z.ZodTypeAny, {
    progress: number;
    status: "paused" | "queued" | "running";
    id: string | number;
    taskName: string;
    started: string;
    duration: number | null;
}, {
    progress: number;
    status: "paused" | "queued" | "running";
    id: string | number;
    taskName: string;
    started: string;
    duration: number | null;
}>;
declare const taskHistorySchema: z.ZodObject<{
    id: z.ZodNumber;
    taskName: z.ZodString;
    started: z.ZodString;
    duration: z.ZodNumber;
    status: z.ZodUnion<[z.ZodLiteral<"success">, z.ZodLiteral<"failed">]>;
    output: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "success" | "failed";
    output: string | null;
    id: number;
    taskName: string;
    started: string;
    duration: number;
}, {
    status: "success" | "failed";
    output: string | null;
    id: number;
    taskName: string;
    started: string;
    duration: number;
}>;
declare const taskDetailsSchema: z.ZodObject<{
    id: z.ZodNumber;
    taskName: z.ZodString;
    started: z.ZodString;
    duration: z.ZodNumber;
    status: z.ZodUnion<[z.ZodLiteral<"success">, z.ZodLiteral<"failed">]>;
    output: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "success" | "failed";
    output: string | null;
    id: number;
    taskName: string;
    started: string;
    duration: number;
}, {
    status: "success" | "failed";
    output: string | null;
    id: number;
    taskName: string;
    started: string;
    duration: number;
}>;
declare const runTaskResultSchema: z.ZodObject<{
    taskId: z.ZodUnion<[z.ZodString, z.ZodNumber]>;
    taskName: z.ZodString;
    queuedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    taskName: string;
    taskId: string | number;
    queuedAt: string;
}, {
    taskName: string;
    taskId: string | number;
    queuedAt: string;
}>;
declare const cancelTaskResultSchema: z.ZodObject<{
    id: z.ZodUnion<[z.ZodString, z.ZodNumber]>;
    taskName: z.ZodString;
    cancelled: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    id: string | number;
    taskName: string;
    cancelled: boolean;
}, {
    id: string | number;
    taskName: string;
    cancelled: boolean;
}>;
declare const eventLevelSchema: z.ZodEnum<["info", "warning", "error", "fatal"]>;
declare const eventTypeSchema: z.ZodEnum<["system", "indexer", "network", "download", "import", "health", "update", "backup", "other"]>;
declare const systemEventSchema: z.ZodObject<{
    id: z.ZodNumber;
    timestamp: z.ZodString;
    level: z.ZodEnum<["info", "warning", "error", "fatal"]>;
    type: z.ZodEnum<["system", "indexer", "network", "download", "import", "health", "update", "backup", "other"]>;
    message: z.ZodString;
    source: z.ZodOptional<z.ZodString>;
    details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    type: "network" | "indexer" | "download" | "import" | "health" | "backup" | "system" | "update" | "other";
    message: string;
    id: number;
    level: "info" | "error" | "warning" | "fatal";
    timestamp: string;
    details?: Record<string, unknown> | undefined;
    source?: string | undefined;
}, {
    type: "network" | "indexer" | "download" | "import" | "health" | "backup" | "system" | "update" | "other";
    message: string;
    id: number;
    level: "info" | "error" | "warning" | "fatal";
    timestamp: string;
    details?: Record<string, unknown> | undefined;
    source?: string | undefined;
}>;
declare const eventClearResultSchema: z.ZodObject<{
    cleared: z.ZodNumber;
    level: z.ZodOptional<z.ZodEnum<["info", "warning", "error", "fatal"]>>;
    before: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    cleared: number;
    level?: "info" | "error" | "warning" | "fatal" | undefined;
    before?: string | undefined;
}, {
    cleared: number;
    level?: "info" | "error" | "warning" | "fatal" | undefined;
    before?: string | undefined;
}>;
export type HealthStatus = z.infer<typeof healthStatusSchema>;
export type HealthCheck = z.infer<typeof healthCheckSchema>;
export type SystemInfo = z.infer<typeof systemInfoSchema>;
export type DatabaseInfo = z.infer<typeof databaseInfoSchema>;
export type DiskSpace = z.infer<typeof diskSpaceSchema>;
export type SystemStatus = z.infer<typeof systemStatusSchema>;
export type HealthSnapshot = z.infer<typeof healthSnapshotSchema>;
export type ScheduledTask = z.infer<typeof scheduledTaskSchema>;
export type QueuedTask = z.infer<typeof queuedTaskSchema>;
export type TaskHistory = z.infer<typeof taskHistorySchema>;
export type TaskDetails = z.infer<typeof taskDetailsSchema>;
export type RunTaskResult = z.infer<typeof runTaskResultSchema>;
export type CancelTaskResult = z.infer<typeof cancelTaskResultSchema>;
export type EventLevel = z.infer<typeof eventLevelSchema>;
export type EventType = z.infer<typeof eventTypeSchema>;
export type SystemEvent = z.infer<typeof systemEventSchema>;
export type EventClearResult = z.infer<typeof eventClearResultSchema>;
export interface TaskHistoryQuery {
    page?: number;
    pageSize?: number;
    status?: 'success' | 'failed';
    taskName?: string;
}
export interface EventsQuery {
    page?: number;
    pageSize?: number;
    level?: EventLevel;
    type?: EventType;
    startDate?: string;
    endDate?: string;
}
export declare function createSystemApi(client: ApiHttpClient): {
    getStatus(): Promise<SystemStatus>;
    getHealth(): Promise<HealthSnapshot>;
    isHealthy(): Promise<{
        ok: boolean;
        uptime: number;
    }>;
    getScheduledTasks(): Promise<ScheduledTask[]>;
    getQueuedTasks(): Promise<QueuedTask[]>;
    getTaskHistory(query?: TaskHistoryQuery): Promise<{
        items: TaskHistory[];
        meta: {
            page: number;
            pageSize: number;
            totalCount: number;
            totalPages: number;
        };
    }>;
    getTaskDetails(id: number): Promise<TaskDetails>;
    runTask(taskId: string | number): Promise<RunTaskResult>;
    cancelTask(taskId: number): Promise<CancelTaskResult>;
    getEvents(query?: EventsQuery): Promise<{
        items: SystemEvent[];
        meta: {
            page: number;
            pageSize: number;
            totalCount: number;
            totalPages: number;
        };
    }>;
    clearEvents(options?: {
        level?: EventLevel;
        before?: string;
    }): Promise<EventClearResult>;
    exportEvents(query: EventsQuery & {
        format: "csv" | "json";
    }): Promise<Blob>;
};
export {};
//# sourceMappingURL=systemApi.d.ts.map