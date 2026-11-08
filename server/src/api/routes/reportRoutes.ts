import fsp from 'node:fs/promises';
import path from 'node:path';
import type { FastifyInstance } from 'fastify';

/**
 * Serves the single Mediarr feature report (automation/reports/mediarr-features.html) so the owner can
 * keep it open in Chrome. Read from disk on every request and sent with no-store: the page refreshes
 * itself every five minutes and picks up the report updates made at the end of each Measure track.
 */
export function registerReportRoutes(
  app: FastifyInstance,
  options: { reportPath?: string } = {},
): void {
  const reportPath = options.reportPath
    ?? process.env.MEDIARR_FEATURE_REPORT
    ?? path.resolve(process.cwd(), 'automation', 'reports', 'mediarr-features.html');

  app.get('/reports/features.html', async (_request, reply) => {
    try {
      const html = await fsp.readFile(reportPath, 'utf-8');
      return reply
        .header('content-type', 'text/html; charset=utf-8')
        .header('cache-control', 'no-store')
        .send(html);
    } catch {
      return reply.code(404).send({
        ok: false,
        error: { code: 'NOT_FOUND', message: 'feature report is missing', retryable: false },
      });
    }
  });
}
