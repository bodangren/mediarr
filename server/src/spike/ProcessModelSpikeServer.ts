import Fastify, { FastifyInstance } from 'fastify';
import type { ServerResponse } from 'node:http';

interface SpikeServerOptions {
  heartbeatIntervalMs?: number;
  host?: string;
}

/**
 * Minimal Fastify process-model spike proving singleton state persistence.
 */
export class ProcessModelSpikeServer {
  private readonly app: FastifyInstance;
  private readonly heartbeatIntervalMs: number;
  private readonly host: string;
  private readonly streamClients = new Set<ServerResponse>();
  private heartbeatCounter = 0;
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor(options: SpikeServerOptions = {}) {
    this.heartbeatIntervalMs = options.heartbeatIntervalMs ?? 2000;
    this.host = options.host ?? '127.0.0.1';
    this.app = Fastify({ logger: false });

    this.registerRoutes();
  }

  async start(port = 3001): Promise<string> {
    if (!this.heartbeatTimer) {
      this.heartbeatTimer = setInterval(() => {
        this.heartbeatCounter += 1;
        const payload = `event: heartbeat\ndata: ${JSON.stringify({ counter: this.heartbeatCounter })}\n\n`;
        for (const client of this.streamClients) {
          client.write(payload);
        }
      }, this.heartbeatIntervalMs);
    }

    const address = await this.app.listen({ port, host: this.host });
    return address;
  }

  async stop(): Promise<void> {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    for (const client of this.streamClients) {
      client.end();
    }
    this.streamClients.clear();

    await this.app.close();
  }

  private registerRoutes(): void {
    this.app.get('/api/health', async () => {
      return {
        ok: true,
        uptime: process.uptime(),
      };
    });

    this.app.get('/api/events/stream', async (request, reply) => {
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });

      this.streamClients.add(reply.raw);

      request.raw.on('close', () => {
        this.streamClients.delete(reply.raw);
      });

      return reply;
    });
  }
}
