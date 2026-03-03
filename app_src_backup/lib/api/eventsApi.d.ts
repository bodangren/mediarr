import { z } from 'zod';
declare const torrentStatsSchema: z.ZodArray<z.ZodObject<{
    infoHash: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
    progress: z.ZodOptional<z.ZodNumber>;
    size: z.ZodOptional<z.ZodString>;
    downloaded: z.ZodOptional<z.ZodString>;
    uploaded: z.ZodOptional<z.ZodString>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    infoHash: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
    progress: z.ZodOptional<z.ZodNumber>;
    size: z.ZodOptional<z.ZodString>;
    downloaded: z.ZodOptional<z.ZodString>;
    uploaded: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    infoHash: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
    progress: z.ZodOptional<z.ZodNumber>;
    size: z.ZodOptional<z.ZodString>;
    downloaded: z.ZodOptional<z.ZodString>;
    uploaded: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">>, "many">;
declare const activityNewSchema: z.ZodObject<{
    id: z.ZodNumber;
    eventType: z.ZodOptional<z.ZodString>;
    summary: z.ZodOptional<z.ZodString>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    id: z.ZodNumber;
    eventType: z.ZodOptional<z.ZodString>;
    summary: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    id: z.ZodNumber;
    eventType: z.ZodOptional<z.ZodString>;
    summary: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">>;
declare const healthUpdateSchema: z.ZodArray<z.ZodObject<{
    indexerId: z.ZodNumber;
    indexerName: z.ZodOptional<z.ZodString>;
    snapshot: z.ZodOptional<z.ZodNullable<z.ZodUnknown>>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    indexerId: z.ZodNumber;
    indexerName: z.ZodOptional<z.ZodString>;
    snapshot: z.ZodOptional<z.ZodNullable<z.ZodUnknown>>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    indexerId: z.ZodNumber;
    indexerName: z.ZodOptional<z.ZodString>;
    snapshot: z.ZodOptional<z.ZodNullable<z.ZodUnknown>>;
}, z.ZodTypeAny, "passthrough">>, "many">;
declare const indexerLifecycleSchema: z.ZodObject<{
    indexerId: z.ZodOptional<z.ZodNumber>;
    id: z.ZodOptional<z.ZodNumber>;
    indexerName: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    enabled: z.ZodOptional<z.ZodBoolean>;
    protocol: z.ZodOptional<z.ZodString>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    indexerId: z.ZodOptional<z.ZodNumber>;
    id: z.ZodOptional<z.ZodNumber>;
    indexerName: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    enabled: z.ZodOptional<z.ZodBoolean>;
    protocol: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    indexerId: z.ZodOptional<z.ZodNumber>;
    id: z.ZodOptional<z.ZodNumber>;
    indexerName: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    enabled: z.ZodOptional<z.ZodBoolean>;
    protocol: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">>;
declare const indexerHealthChangedSchema: z.ZodObject<{
    indexerId: z.ZodOptional<z.ZodNumber>;
    id: z.ZodOptional<z.ZodNumber>;
    indexerName: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
    severity: z.ZodOptional<z.ZodString>;
    snapshot: z.ZodOptional<z.ZodNullable<z.ZodUnknown>>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    indexerId: z.ZodOptional<z.ZodNumber>;
    id: z.ZodOptional<z.ZodNumber>;
    indexerName: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
    severity: z.ZodOptional<z.ZodString>;
    snapshot: z.ZodOptional<z.ZodNullable<z.ZodUnknown>>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    indexerId: z.ZodOptional<z.ZodNumber>;
    id: z.ZodOptional<z.ZodNumber>;
    indexerName: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
    severity: z.ZodOptional<z.ZodString>;
    snapshot: z.ZodOptional<z.ZodNullable<z.ZodUnknown>>;
}, z.ZodTypeAny, "passthrough">>;
declare const commandStateSchema: z.ZodObject<{
    commandId: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
    id: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
    name: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
    state: z.ZodOptional<z.ZodString>;
    progress: z.ZodOptional<z.ZodNumber>;
    startedAt: z.ZodOptional<z.ZodString>;
    completedAt: z.ZodOptional<z.ZodString>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    commandId: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
    id: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
    name: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
    state: z.ZodOptional<z.ZodString>;
    progress: z.ZodOptional<z.ZodNumber>;
    startedAt: z.ZodOptional<z.ZodString>;
    completedAt: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    commandId: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
    id: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
    name: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
    state: z.ZodOptional<z.ZodString>;
    progress: z.ZodOptional<z.ZodNumber>;
    startedAt: z.ZodOptional<z.ZodString>;
    completedAt: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">>;
declare const heartbeatSchema: z.ZodObject<{
    timestamp: z.ZodString;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    timestamp: z.ZodString;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    timestamp: z.ZodString;
}, z.ZodTypeAny, "passthrough">>;
export type ConnectionState = 'idle' | 'connecting' | 'open' | 'reconnecting' | 'closed';
export interface EventsPayloadMap {
    'torrent:stats': z.infer<typeof torrentStatsSchema>;
    'activity:new': z.infer<typeof activityNewSchema>;
    'health:update': z.infer<typeof healthUpdateSchema>;
    'indexer:added': z.infer<typeof indexerLifecycleSchema>;
    'indexer:updated': z.infer<typeof indexerLifecycleSchema>;
    'indexer:deleted': z.infer<typeof indexerLifecycleSchema>;
    'indexer:healthChanged': z.infer<typeof indexerHealthChangedSchema>;
    'command:started': z.infer<typeof commandStateSchema>;
    'command:completed': z.infer<typeof commandStateSchema>;
    heartbeat: z.infer<typeof heartbeatSchema>;
}
type EventName = keyof EventsPayloadMap;
type EventHandler<T extends EventName> = (payload: EventsPayloadMap[T]) => void;
type StateHandler = (state: ConnectionState) => void;
interface EventSourceLike {
    addEventListener(type: string, listener: (event: MessageEvent) => void): void;
    close(): void;
}
export interface EventsApiOptions {
    baseUrl?: string;
    eventSourceFactory?: (url: string) => EventSourceLike;
    maxReconnectDelayMs?: number;
}
export declare class EventsApiClient {
    private readonly streamUrl;
    private readonly eventSourceFactory;
    private readonly maxReconnectDelayMs;
    private eventSource;
    private reconnectTimer;
    private reconnectAttempt;
    private manualClose;
    private state;
    private readonly handlers;
    private readonly stateHandlers;
    constructor(options?: EventsApiOptions);
    get connectionState(): ConnectionState;
    connect(): void;
    disconnect(): void;
    on<T extends EventName>(event: T, handler: EventHandler<T>): () => void;
    onStateChange(handler: StateHandler): () => void;
    private openStream;
    private handleEvent;
    private scheduleReconnect;
    private clearReconnectTimer;
    private transition;
}
export declare function createEventsApi(options?: EventsApiOptions): EventsApiClient;
export {};
//# sourceMappingURL=eventsApi.d.ts.map