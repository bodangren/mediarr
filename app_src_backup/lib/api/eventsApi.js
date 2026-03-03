import { z } from 'zod';
import { routeMap } from './routeMap';
const torrentStatsSchema = z.array(z.object({
    infoHash: z.string(),
    name: z.string().optional(),
    status: z.string().optional(),
    progress: z.number().optional(),
    size: z.string().optional(),
    downloaded: z.string().optional(),
    uploaded: z.string().optional(),
}).passthrough());
const activityNewSchema = z.object({
    id: z.number(),
    eventType: z.string().optional(),
    summary: z.string().optional(),
}).passthrough();
const healthUpdateSchema = z.array(z.object({
    indexerId: z.number(),
    indexerName: z.string().optional(),
    snapshot: z.unknown().nullable().optional(),
}).passthrough());
const indexerLifecycleSchema = z.object({
    indexerId: z.number().optional(),
    id: z.number().optional(),
    indexerName: z.string().optional(),
    name: z.string().optional(),
    enabled: z.boolean().optional(),
    protocol: z.string().optional(),
}).passthrough();
const indexerHealthChangedSchema = z.object({
    indexerId: z.number().optional(),
    id: z.number().optional(),
    indexerName: z.string().optional(),
    status: z.string().optional(),
    severity: z.string().optional(),
    snapshot: z.unknown().nullable().optional(),
}).passthrough();
const commandStateSchema = z.object({
    commandId: z.union([z.number(), z.string()]).optional(),
    id: z.union([z.number(), z.string()]).optional(),
    name: z.string().optional(),
    status: z.string().optional(),
    state: z.string().optional(),
    progress: z.number().optional(),
    startedAt: z.string().optional(),
    completedAt: z.string().optional(),
}).passthrough();
const heartbeatSchema = z.object({
    timestamp: z.string(),
}).passthrough();
export class EventsApiClient {
    streamUrl;
    eventSourceFactory;
    maxReconnectDelayMs;
    eventSource = null;
    reconnectTimer = null;
    reconnectAttempt = 0;
    manualClose = false;
    state = 'idle';
    handlers = {
        'torrent:stats': new Set(),
        'activity:new': new Set(),
        'health:update': new Set(),
        'indexer:added': new Set(),
        'indexer:updated': new Set(),
        'indexer:deleted': new Set(),
        'indexer:healthChanged': new Set(),
        'command:started': new Set(),
        'command:completed': new Set(),
        heartbeat: new Set(),
    };
    stateHandlers = new Set();
    constructor(options = {}) {
        this.streamUrl = `${options.baseUrl ?? ''}${routeMap.eventsStream}`;
        this.maxReconnectDelayMs = options.maxReconnectDelayMs ?? 30_000;
        this.eventSourceFactory =
            options.eventSourceFactory ??
                ((url) => {
                    if (typeof EventSource === 'undefined') {
                        throw new Error('EventSource is not available in this runtime');
                    }
                    return new EventSource(url);
                });
    }
    get connectionState() {
        return this.state;
    }
    connect() {
        if (this.eventSource) {
            return;
        }
        this.manualClose = false;
        this.transition(this.reconnectAttempt > 0 ? 'reconnecting' : 'connecting');
        this.openStream();
    }
    disconnect() {
        this.manualClose = true;
        this.clearReconnectTimer();
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
        this.reconnectAttempt = 0;
        this.transition('closed');
    }
    on(event, handler) {
        const handlers = this.handlers[event];
        handlers.add(handler);
        return () => {
            handlers.delete(handler);
        };
    }
    onStateChange(handler) {
        this.stateHandlers.add(handler);
        return () => {
            this.stateHandlers.delete(handler);
        };
    }
    openStream() {
        const source = this.eventSourceFactory(this.streamUrl);
        this.eventSource = source;
        source.addEventListener('open', () => {
            this.reconnectAttempt = 0;
            this.transition('open');
        });
        source.addEventListener('error', () => {
            if (this.manualClose) {
                return;
            }
            this.scheduleReconnect();
        });
        source.addEventListener('torrent:stats', event => {
            this.handleEvent('torrent:stats', event, torrentStatsSchema);
        });
        source.addEventListener('activity:new', event => {
            this.handleEvent('activity:new', event, activityNewSchema);
        });
        source.addEventListener('health:update', event => {
            this.handleEvent('health:update', event, healthUpdateSchema);
        });
        source.addEventListener('indexer:added', event => {
            this.handleEvent('indexer:added', event, indexerLifecycleSchema);
        });
        source.addEventListener('indexer:updated', event => {
            this.handleEvent('indexer:updated', event, indexerLifecycleSchema);
        });
        source.addEventListener('indexer:deleted', event => {
            this.handleEvent('indexer:deleted', event, indexerLifecycleSchema);
        });
        source.addEventListener('indexer:healthChanged', event => {
            this.handleEvent('indexer:healthChanged', event, indexerHealthChangedSchema);
        });
        source.addEventListener('command:started', event => {
            this.handleEvent('command:started', event, commandStateSchema);
        });
        source.addEventListener('command:completed', event => {
            this.handleEvent('command:completed', event, commandStateSchema);
        });
        source.addEventListener('heartbeat', event => {
            this.handleEvent('heartbeat', event, heartbeatSchema);
        });
    }
    handleEvent(name, event, schema) {
        const rawData = typeof event.data === 'string' ? event.data : JSON.stringify(event.data);
        let parsedJson;
        try {
            parsedJson = JSON.parse(rawData);
        }
        catch {
            return;
        }
        const parsed = schema.safeParse(parsedJson);
        if (!parsed.success) {
            return;
        }
        for (const handler of this.handlers[name]) {
            handler(parsed.data);
        }
    }
    scheduleReconnect() {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
        this.clearReconnectTimer();
        const delay = Math.min(1_000 * Math.pow(2, this.reconnectAttempt), this.maxReconnectDelayMs);
        this.reconnectAttempt += 1;
        this.transition('reconnecting');
        this.reconnectTimer = setTimeout(() => {
            if (this.manualClose) {
                return;
            }
            this.openStream();
        }, delay);
    }
    clearReconnectTimer() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }
    transition(next) {
        this.state = next;
        for (const handler of this.stateHandlers) {
            handler(next);
        }
    }
}
export function createEventsApi(options = {}) {
    return new EventsApiClient(options);
}
//# sourceMappingURL=eventsApi.js.map