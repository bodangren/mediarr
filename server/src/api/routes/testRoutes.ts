/**
 * Test-only routes, registered only when NODE_ENV === 'test'.
 * These MUST NOT be exposed in production.
 */
import type { FastifyInstance } from 'fastify';
import type { ApiEventHub } from '../eventHub';

export function registerTestRoutes(
  app: FastifyInstance,
  eventHub: ApiEventHub,
): void {
  if (process.env.NODE_ENV !== 'test') {
    return;
  }

  /**
   * POST /api/__test__/emit-event
   * Body: { event: string; payload?: unknown }
   * Publishes an SSE event through the ApiEventHub so connectivity
   * tests can assert round-trip delivery.
   */
  app.post('/api/__test__/emit-event', async (request, reply) => {
    const body = request.body as { event?: string; payload?: unknown };
    const event = typeof body?.event === 'string' && body.event.trim()
      ? body.event.trim()
      : 'test:ping';
    const payload = body?.payload ?? { source: 'connectivity-test' };

    eventHub.publish(event, payload);

    return reply.send({ ok: true, event, clientCount: eventHub.clientCount });
  });
}
