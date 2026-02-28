import type { FastifyInstance } from 'fastify';
import { NotFoundError, ValidationError } from '../../errors/domainErrors';
import {
  paginateArray,
  parsePaginationParams,
  sendPaginatedSuccess,
  sendSuccess,
} from '../contracts';
import type { ApiDependencies } from '../types';

function maybeNotFound(error: unknown): never {
  if (error instanceof Error && /not found/i.test(error.message)) {
    throw new NotFoundError(error.message);
  }

  throw error;
}

export function registerTorrentRoutes(
  app: FastifyInstance,
  deps: ApiDependencies,
): void {
  app.get('/api/torrents', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: ['number', 'string'] },
          pageSize: { type: ['number', 'string'] },
        },
      },
    },
  }, async (request, reply) => {
    if (!deps.torrentManager?.getTorrentsStatus) {
      throw new ValidationError('Torrent manager is not configured');
    }

    const pagination = parsePaginationParams(request.query as Record<string, unknown>);
    const allTorrents = await deps.torrentManager.getTorrentsStatus();
    const paged = paginateArray(allTorrents, pagination.page, pagination.pageSize);

    return sendPaginatedSuccess(reply, paged.items, {
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalCount: paged.totalCount,
    });
  });

  app.get('/api/torrents/:infoHash', {
    schema: {
      params: {
        type: 'object',
        required: ['infoHash'],
        properties: {
          infoHash: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    if (!deps.torrentManager?.getTorrentStatus) {
      throw new ValidationError('Torrent manager is not configured');
    }

    const infoHash = (request.params as { infoHash: string }).infoHash;

    try {
      const torrent = await deps.torrentManager.getTorrentStatus(infoHash);
      return sendSuccess(reply, torrent);
    } catch (error) {
      maybeNotFound(error);
    }
  });

  app.post('/api/torrents', {
    schema: {
      body: {
        type: 'object',
        properties: {
          magnetUrl: { type: 'string' },
          path: { type: 'string' },
          torrentFileBase64: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    if (!deps.torrentManager?.addTorrent) {
      throw new ValidationError('Torrent manager is not configured');
    }

    const body = request.body as {
      magnetUrl?: string;
      path?: string;
      torrentFileBase64?: string;
    };

    const options: {
      magnetUrl?: string;
      path?: string;
      torrentFile?: Buffer;
    } = {
      magnetUrl: body.magnetUrl,
      path: body.path,
    };

    if (typeof body.torrentFileBase64 === 'string') {
      options.torrentFile = Buffer.from(body.torrentFileBase64, 'base64');
    }

    const result = await deps.torrentManager.addTorrent(options);
    return sendSuccess(reply, result, 201);
  });

  app.patch('/api/torrents/:infoHash/pause', {
    schema: {
      params: {
        type: 'object',
        required: ['infoHash'],
        properties: {
          infoHash: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    if (!deps.torrentManager?.pauseTorrent) {
      throw new ValidationError('Torrent manager is not configured');
    }

    const infoHash = (request.params as { infoHash: string }).infoHash;

    try {
      await deps.torrentManager.pauseTorrent(infoHash);
      return sendSuccess(reply, {
        infoHash,
        status: 'paused',
      });
    } catch (error) {
      maybeNotFound(error);
    }
  });

  app.patch('/api/torrents/:infoHash/resume', {
    schema: {
      params: {
        type: 'object',
        required: ['infoHash'],
        properties: {
          infoHash: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    if (!deps.torrentManager?.resumeTorrent) {
      throw new ValidationError('Torrent manager is not configured');
    }

    const infoHash = (request.params as { infoHash: string }).infoHash;

    try {
      await deps.torrentManager.resumeTorrent(infoHash);
      return sendSuccess(reply, {
        infoHash,
        status: 'downloading',
      });
    } catch (error) {
      maybeNotFound(error);
    }
  });

  app.delete('/api/torrents/:infoHash', {
    schema: {
      params: {
        type: 'object',
        required: ['infoHash'],
        properties: {
          infoHash: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    if (!deps.torrentManager?.removeTorrent) {
      throw new ValidationError('Torrent manager is not configured');
    }

    const infoHash = (request.params as { infoHash: string }).infoHash;

    try {
      await deps.torrentManager.removeTorrent(infoHash);
      return sendSuccess(reply, {
        infoHash,
        removed: true,
      });
    } catch (error) {
      maybeNotFound(error);
    }
  });

  app.post('/api/torrents/:infoHash/retry-import', {
    schema: {
      params: {
        type: 'object',
        required: ['infoHash'],
        properties: {
          infoHash: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    if (!deps.importManager?.retryImportByInfoHash) {
      throw new ValidationError('Import manager is not configured');
    }

    const infoHash = (request.params as { infoHash: string }).infoHash;

    try {
      await deps.importManager.retryImportByInfoHash(infoHash);
      return sendSuccess(reply, {
        infoHash,
        retried: true,
      });
    } catch (error) {
      maybeNotFound(error);
    }
  });

  app.patch('/api/torrents/speed-limits', {
    schema: {
      body: {
        type: 'object',
        properties: {
          download: { type: 'number' },
          upload: { type: 'number' },
        },
      },
    },
  }, async (request, reply) => {
    if (!deps.torrentManager?.setSpeedLimits) {
      throw new ValidationError('Torrent manager is not configured');
    }

    const body = request.body as { download?: number; upload?: number };
    deps.torrentManager.setSpeedLimits(body);

    return sendSuccess(reply, {
      updated: true,
      limits: body,
    });
  });
}
