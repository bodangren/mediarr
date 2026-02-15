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

export class EventsApiClient {
  private readonly streamUrl: string;
  private readonly eventSourceFactory: (url: string) => EventSourceLike;
  private readonly maxReconnectDelayMs: number;

  private eventSource: EventSourceLike | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private manualClose = false;
  private state: ConnectionState = 'idle';

  private readonly handlers: {
    [K in EventName]: Set<EventHandler<K>>;
  } = {
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

  private readonly stateHandlers = new Set<StateHandler>();

  constructor(options: EventsApiOptions = {}) {
    this.streamUrl = `${options.baseUrl ?? ''}${routeMap.eventsStream}`;
    this.maxReconnectDelayMs = options.maxReconnectDelayMs ?? 30_000;
    this.eventSourceFactory =
      options.eventSourceFactory ??
      ((url: string) => {
        if (typeof EventSource === 'undefined') {
          throw new Error('EventSource is not available in this runtime');
        }

        return new EventSource(url) as unknown as EventSourceLike;
      });
  }

  get connectionState(): ConnectionState {
    return this.state;
  }

  connect(): void {
    if (this.eventSource) {
      return;
    }

    this.manualClose = false;
    this.transition(this.reconnectAttempt > 0 ? 'reconnecting' : 'connecting');
    this.openStream();
  }

  disconnect(): void {
    this.manualClose = true;
    this.clearReconnectTimer();

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    this.reconnectAttempt = 0;
    this.transition('closed');
  }

  on<T extends EventName>(event: T, handler: EventHandler<T>): () => void {
    const handlers = this.handlers[event] as Set<EventHandler<T>>;
    handlers.add(handler);

    return () => {
      handlers.delete(handler);
    };
  }

  onStateChange(handler: StateHandler): () => void {
    this.stateHandlers.add(handler);

    return () => {
      this.stateHandlers.delete(handler);
    };
  }

  private openStream(): void {
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

  private handleEvent<T extends EventName>(
    name: T,
    event: MessageEvent,
    schema: z.ZodType<EventsPayloadMap[T]>,
  ): void {
    const rawData = typeof event.data === 'string' ? event.data : JSON.stringify(event.data);

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawData);
    } catch {
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

  private scheduleReconnect(): void {
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

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private transition(next: ConnectionState): void {
    this.state = next;
    for (const handler of this.stateHandlers) {
      handler(next);
    }
  }
}

export function createEventsApi(options: EventsApiOptions = {}): EventsApiClient {
  return new EventsApiClient(options);
}
