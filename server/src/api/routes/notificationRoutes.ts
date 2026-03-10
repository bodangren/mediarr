/**
 * Notification API Routes
 *
 * Push notifications are delivered directly to connected clients (Android TV)
 * via the SSE event stream. These routes expose the push notification status.
 *
 * @module routes/notifications
 */
import type { FastifyInstance } from 'fastify';
import { sendSuccess } from '../contracts';
import type { ApiDependencies } from '../types';

export function registerNotificationRoutes(
  app: FastifyInstance,
  deps: ApiDependencies,
): void {
  // GET /api/notifications/push-status — push notification delivery status
  app.get('/api/notifications/push-status', async (_request, reply) => {
    const connectedClients = deps.eventHub?.clientCount ?? 0;
    return sendSuccess(reply, {
      enabled: true,
      transport: 'sse',
      connectedClients,
      description: 'Notifications are pushed via SSE to connected Android TV clients.',
    });
  });
}
