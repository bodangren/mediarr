import type { ServerResponse } from 'node:http';

function formatSseFrame(event: string, payload: unknown): string {
  let data: string;
  try {
    data = JSON.stringify(payload);
  } catch {
    data = JSON.stringify({ error: 'serialization_failed' });
  }
  return `event: ${event}\ndata: ${data}\n\n`;
}

/**
 * Maintains SSE connections and broadcasts typed contract events.
 */
export class ApiEventHub {
  private readonly clients = new Set<ServerResponse>();
  private readonly heartbeatIntervalMs: number;
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor(heartbeatIntervalMs = 30000) {
    this.heartbeatIntervalMs = heartbeatIntervalMs;
  }

  get clientCount(): number {
    return this.clients.size;
  }

  addClient(client: ServerResponse): void {
    this.clients.add(client);
    this.ensureHeartbeat();
  }

  removeClient(client: ServerResponse): void {
    this.clients.delete(client);
    if (this.clients.size === 0) {
      this.stopHeartbeat();
    }
  }

  publish(event: string, payload: unknown): void {
    const frame = formatSseFrame(event, payload);
    for (const client of this.clients) {
      try {
        client.write(frame);
      } catch {
        this.clients.delete(client);
      }
    }
  }

  close(): void {
    this.stopHeartbeat();

    for (const client of this.clients) {
      try {
        client.end();
      } catch {
        // no-op
      }
    }
    this.clients.clear();
  }

  private ensureHeartbeat(): void {
    if (this.heartbeatTimer) {
      return;
    }

    this.heartbeatTimer = setInterval(() => {
      this.publish('heartbeat', {
        timestamp: new Date().toISOString(),
      });
    }, this.heartbeatIntervalMs);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}
