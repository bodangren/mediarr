import { QueryClient } from '@tanstack/react-query';
export declare const STALE_TIMES: {
    readonly list: 30000;
    readonly detail: 60000;
    readonly queue: 5000;
    readonly tasksScheduled: 60000;
    readonly tasksQueued: 5000;
    readonly tasksHistory: 30000;
    readonly systemEvents: 15000;
    readonly backups: 30000;
    readonly backupSchedule: 60000;
};
export type StaleTimeKind = keyof typeof STALE_TIMES;
export declare function createQueryClient(): QueryClient;
//# sourceMappingURL=queryClient.d.ts.map