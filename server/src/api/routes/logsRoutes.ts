import type { FastifyInstance } from 'fastify';
import { NotFoundError } from '../../errors/domainErrors';
import { sendSuccess } from '../contracts';
import type { ApiDependencies } from '../types';

type LogReader = NonNullable<ApiDependencies['logReaderService']>;

function requireLogReader(deps: ApiDependencies): LogReader {
  if (!deps.logReaderService) {
    throw new Error('Log reader service is not configured');
  }
  return deps.logReaderService;
}

function requireFilename(value: string | undefined): string {
  if (!value) {
    throw new NotFoundError('Log filename is required');
  }
  return value;
}

function parseLimit(value: unknown): number | undefined {
  const parsed = typeof value === 'number'
    ? value
    : typeof value === 'string'
      ? Number.parseInt(value, 10)
      : Number.NaN;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export function registerLogsRoutes(
  app: FastifyInstance,
  deps: ApiDependencies,
): void {
  app.get('/api/logs/files', async (_request, reply) => {
    return sendSuccess(reply, requireLogReader(deps).listFiles());
  });

  app.get('/api/logs/files/:filename', async (request, reply) => {
    const filename = requireFilename((request.params as { filename?: string }).filename);
    const query = request.query as { limit?: unknown };
    const contents = requireLogReader(deps).getFileContents(filename, parseLimit(query.limit));
    if (!contents) {
      throw new NotFoundError(`Log file "${filename}" not found`);
    }
    return sendSuccess(reply, contents);
  });

  app.delete('/api/logs/files/:filename', async (request, reply) => {
    const filename = requireFilename((request.params as { filename?: string }).filename);
    if (!requireLogReader(deps).deleteFile(filename)) {
      throw new NotFoundError(`Log file "${filename}" not found`);
    }
    return sendSuccess(reply, { success: true, filename });
  });

  app.post('/api/logs/files/:filename/clear', async (request, reply) => {
    const filename = requireFilename((request.params as { filename?: string }).filename);
    if (!requireLogReader(deps).clearFile(filename)) {
      throw new NotFoundError(`Log file "${filename}" not found`);
    }
    return sendSuccess(reply, { success: true, filename });
  });

  app.get('/api/logs/files/:filename/download', async (request, reply) => {
    const filename = requireFilename((request.params as { filename?: string }).filename);
    if (requireLogReader(deps).getRawFile(filename) === null) {
      throw new NotFoundError(`Log file "${filename}" not found`);
    }
    return sendSuccess(reply, {
      downloadUrl: `/api/logs/files/${encodeURIComponent(filename)}/raw`,
      filename,
    });
  });

  app.get('/api/logs/files/:filename/raw', async (request, reply) => {
    const filename = requireFilename((request.params as { filename?: string }).filename);
    const contents = requireLogReader(deps).getRawFile(filename);
    if (contents === null) {
      throw new NotFoundError(`Log file "${filename}" not found`);
    }
    reply.header('Content-Type', 'text/plain; charset=utf-8');
    reply.header('Content-Disposition', `attachment; filename="${filename}"`);
    return contents;
  });
}
