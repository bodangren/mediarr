import type { FastifyInstance } from 'fastify';
import type { ApiEventHub } from '../eventHub';

export function registerEventsRoutes(
  app: FastifyInstance,
  eventHub: ApiEventHub,
): void {
  app.get('/api/events/stream', async (request, reply) => {
    reply.hijack();
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    reply.raw.write('retry: 1000\n\n');
    eventHub.addClient(reply.raw);

    request.raw.on('close', () => {
      eventHub.removeClient(reply.raw);
    });
  });
}
