import type { FastifyInstance } from 'fastify';
import { NotFoundError } from '../../errors/domainErrors';
import { sendSuccess } from '../contracts';
import type { ApiDependencies } from '../types';

// Types
interface LogFile {
  filename: string;
  size: number;
  lastModified: string;
}

// In-memory state
const logFiles: Map<string, { metadata: LogFile; contents: string }> = new Map([
  ['mediarr.log', {
    metadata: {
      filename: 'mediarr.log',
      size: 524288,
      lastModified: new Date().toISOString(),
    },
    contents: [
      '[2024-02-15 10:30:00] INFO  [main] Server started on port 3001',
      '[2024-02-15 10:30:01] INFO  [indexer] Loading indexer definitions...',
      '[2024-02-15 10:30:02] INFO  [indexer] Loaded 15 indexer definitions',
      '[2024-02-15 10:30:05] INFO  [scheduler] Starting RSS sync scheduler',
      '[2024-02-15 10:35:00] INFO  [rss] RSS sync started',
      '[2024-02-15 10:35:02] WARN  [rss] Slow response from indexer "Example Indexer"',
      '[2024-02-15 10:35:05] INFO  [rss] RSS sync completed - 42 releases processed',
      '[2024-02-15 10:40:00] ERROR [torrent] Failed to add torrent: Connection refused',
      '[2024-02-15 10:40:05] INFO  [torrent] Retrying torrent addition...',
      '[2024-02-15 10:40:10] INFO  [torrent] Torrent added successfully',
    ].join('\n'),
  }],
  ['mediarr.trace.log', {
    metadata: {
      filename: 'mediarr.trace.log',
      size: 2097152,
      lastModified: new Date(Date.now() - 3600000).toISOString(),
    },
    contents: [
      '[2024-02-15 09:00:00] DEBUG [http] GET /api/series -> 200',
      '[2024-02-15 09:00:01] DEBUG [http] GET /api/movies -> 200',
      '[2024-02-15 09:00:02] DEBUG [prisma] SELECT * FROM media LIMIT 25',
      '[2024-02-15 09:00:03] DEBUG [http] GET /api/torrents -> 200',
      '[2024-02-15 09:00:05] DEBUG [sse] Client connected to event stream',
    ].join('\n'),
  }],
  ['update.log', {
    metadata: {
      filename: 'update.log',
      size: 8192,
      lastModified: new Date(Date.now() - 86400000).toISOString(),
    },
    contents: [
      '[2024-02-14 08:00:00] INFO  [update] Checking for updates...',
      '[2024-02-14 08:00:01] INFO  [update] Current version: 1.0.0',
      '[2024-02-14 08:00:02] INFO  [update] No updates available',
    ].join('\n'),
  }],
]);

// Export state for testing
export const logsState = {
  get logFiles() { return logFiles; },
};

export function registerLogsRoutes(
  app: FastifyInstance,
  deps: ApiDependencies,
): void {
  // GET /api/logs/files
  app.get('/api/logs/files', async (request, reply) => {
    if (deps.logReaderService) {
      const query = request.query as Record<string, unknown>;
      const page = typeof query.page === 'string' ? parseInt(query.page, 10) : 1;
      const pageSize = typeof query.pageSize === 'string' ? parseInt(query.pageSize, 10) : 100;
      const filter = {
        level: query.level as 'info' | 'warn' | 'error' | 'debug' | undefined,
        search: typeof query.search === 'string' ? query.search : undefined,
        startDate: typeof query.startDate === 'string' ? query.startDate : undefined,
        endDate: typeof query.endDate === 'string' ? query.endDate : undefined,
      };
      const result = deps.logReaderService.getEntries(filter, page, pageSize);
      return sendSuccess(reply, result);
    }
    const files = Array.from(logFiles.values()).map(f => f.metadata);
    // Sort by most recently modified first
    files.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
    return sendSuccess(reply, files);
  });

  // GET /api/logs/files/:filename
  app.get('/api/logs/files/:filename', async (request, reply) => {
    const params = request.params as { filename?: string };
    const filename = params.filename;

    if (!filename) {
      throw new NotFoundError('Log filename is required');
    }

    const file = logFiles.get(filename);
    if (!file) {
      throw new NotFoundError(`Log file "${filename}" not found`);
    }

    const query = request.query as Record<string, unknown>;
    const limit = typeof query.limit === 'number' 
      ? query.limit 
      : typeof query.limit === 'string' 
        ? parseInt(query.limit, 10) 
        : undefined;

    let contents = file.contents;
    if (limit && !isNaN(limit) && limit > 0) {
      const lines = contents.split('\n');
      contents = lines.slice(-limit).join('\n');
    }

    return sendSuccess(reply, {
      filename: file.metadata.filename,
      contents,
      totalLines: file.contents.split('\n').filter(l => l.trim()).length,
    });
  });

  // DELETE /api/logs/files/:filename
  app.delete('/api/logs/files/:filename', async (request, reply) => {
    const params = request.params as { filename?: string };
    const filename = params.filename;

    if (!filename) {
      throw new NotFoundError('Log filename is required');
    }

    if (!logFiles.has(filename)) {
      throw new NotFoundError(`Log file "${filename}" not found`);
    }

    logFiles.delete(filename);

    return sendSuccess(reply, {
      success: true,
      filename,
    });
  });

  // POST /api/logs/files/:filename/clear
  app.post('/api/logs/files/:filename/clear', async (request, reply) => {
    const params = request.params as { filename?: string };
    const filename = params.filename;

    if (!filename) {
      throw new NotFoundError('Log filename is required');
    }

    const file = logFiles.get(filename);
    if (!file) {
      throw new NotFoundError(`Log file "${filename}" not found`);
    }

    // Clear contents but keep the file
    logFiles.set(filename, {
      metadata: {
        ...file.metadata,
        size: 0,
        lastModified: new Date().toISOString(),
      },
      contents: '',
    });

    return sendSuccess(reply, {
      success: true,
      filename,
    });
  });

  // GET /api/logs/files/:filename/download
  app.get('/api/logs/files/:filename/download', async (request, reply) => {
    const params = request.params as { filename?: string };
    const filename = params.filename;

    if (!filename) {
      throw new NotFoundError('Log filename is required');
    }

    const file = logFiles.get(filename);
    if (!file) {
      throw new NotFoundError(`Log file "${filename}" not found`);
    }

    // Return a download URL that points to the raw endpoint
    return sendSuccess(reply, {
      downloadUrl: `/api/logs/files/${encodeURIComponent(filename)}/raw`,
      filename,
    });
  });

  // GET /api/logs/files/:filename/raw
  app.get('/api/logs/files/:filename/raw', async (request, reply) => {
    const params = request.params as { filename?: string };
    const filename = params.filename;

    if (!filename) {
      throw new NotFoundError('Log filename is required');
    }

    const file = logFiles.get(filename);
    if (!file) {
      throw new NotFoundError(`Log file "${filename}" not found`);
    }

    // Serve the raw file content for download
    reply.header('Content-Type', 'text/plain; charset=utf-8');
    reply.header('Content-Disposition', `attachment; filename="${filename}"`);
    return file.contents;
  });
}
