import type { FastifyInstance } from 'fastify';
import { NotFoundError } from '../../errors/domainErrors';
import { paginateArray, parsePaginationParams, sendPaginatedSuccess, sendSuccess } from '../contracts';
import type { ApiDependencies } from '../types';

// Types
type UpdateStatus = 'queued' | 'downloading' | 'installing' | 'completed' | 'failed';
type HistoryStatus = 'success' | 'failed';
type InstallStatus = 'started' | 'queued';

interface UpdateProgress {
  updateId: string;
  version: string;
  status: UpdateStatus;
  progress: number;
  message: string;
  startedAt: string;
  completedAt?: string;
  estimatedTimeRemaining?: number;
  error?: string;
}

interface UpdateHistoryEntry {
  id: number;
  version: string;
  installedDate: string;
  status: HistoryStatus;
  branch: string;
}

// In-memory state
const currentVersion = {
  version: '1.0.0',
  branch: 'main',
  commit: 'abc123def456789',
  buildDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
};

let availableUpdate = {
  available: false,
  version: undefined as string | undefined,
  releaseDate: undefined as string | undefined,
  changelog: undefined as string | undefined,
  downloadUrl: undefined as string | undefined,
};

let updateHistory: UpdateHistoryEntry[] = [
  {
    id: 1,
    version: '1.0.0',
    installedDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'success',
    branch: 'main',
  },
  {
    id: 2,
    version: '0.9.0',
    installedDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'success',
    branch: 'main',
  },
  {
    id: 3,
    version: '0.8.5',
    installedDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'success',
    branch: 'develop',
  },
  {
    id: 4,
    version: '0.8.0',
    installedDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'failed',
    branch: 'main',
  },
];
let updateHistoryIdCounter = 5;

const activeUpdates: Map<string, UpdateProgress> = new Map();
let updateIdCounter = 1;

// Export state for testing
export const updatesState = {
  get availableUpdate() { return availableUpdate; },
  set availableUpdate(v) { availableUpdate = v; },
  get updateHistory() { return updateHistory; },
  set updateHistory(v) { updateHistory = v; },
  get activeUpdates() { return activeUpdates; },
  get currentVersion() { return currentVersion; },
};

export function registerUpdatesRoutes(
  app: FastifyInstance,
  _deps: ApiDependencies,
): void {
  // GET /api/updates/current
  app.get('/api/updates/current', async (_request, reply) => {
    return sendSuccess(reply, currentVersion);
  });

  // GET /api/updates/available
  app.get('/api/updates/available', async (_request, reply) => {
    return sendSuccess(reply, availableUpdate);
  });

  // GET /api/updates/history
  app.get('/api/updates/history', {
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
    const query = request.query as Record<string, unknown>;
    const pagination = parsePaginationParams(query);

    // Sort by most recent first
    const sorted = [...updateHistory].sort(
      (a, b) => new Date(b.installedDate).getTime() - new Date(a.installedDate).getTime()
    );

    const { items, totalCount } = paginateArray(sorted, pagination.page, pagination.pageSize);

    return sendPaginatedSuccess(reply, items, {
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalCount,
    });
  });

  // POST /api/updates/check
  app.post('/api/updates/check', async (_request, reply) => {
    // Simulate checking for updates
    const hasUpdate = Math.random() > 0.7; // 30% chance of having an update

    if (hasUpdate) {
      availableUpdate = {
        available: true,
        version: '1.1.0',
        releaseDate: new Date().toISOString(),
        changelog: '## New Features\n- Added new feature X\n- Improved performance\n\n## Bug Fixes\n- Fixed issue with Y',
        downloadUrl: 'https://github.com/example/mediarr/releases/download/v1.1.0/mediarr-v1.1.0.zip',
      };
    } else {
      availableUpdate = {
        available: false,
        version: undefined,
        releaseDate: undefined,
        changelog: undefined,
        downloadUrl: undefined,
      };
    }

    return sendSuccess(reply, {
      checked: true,
      timestamp: new Date().toISOString(),
    });
  });

  // POST /api/updates/install
  app.post('/api/updates/install', {
    schema: {
      body: {
        type: 'object',
        required: ['version'],
        properties: {
          version: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const body = request.body as { version: string };
    const version = body.version;

    if (!version) {
      throw new NotFoundError('Version is required');
    }

    const updateId = `update-${updateIdCounter++}`;
    const startedAt = new Date().toISOString();

    const progress: UpdateProgress = {
      updateId,
      version,
      status: 'queued',
      progress: 0,
      message: 'Update queued for installation',
      startedAt,
    };

    activeUpdates.set(updateId, progress);

    // Simulate update process (in real impl, this would be handled by an update manager)
    setTimeout(() => {
      const p = activeUpdates.get(updateId);
      if (!p) return;
      
      p.status = 'downloading';
      p.message = 'Downloading update package...';
      p.progress = 10;
    }, 500);

    setTimeout(() => {
      const p = activeUpdates.get(updateId);
      if (!p) return;
      
      p.progress = 50;
      p.message = 'Download complete. Preparing installation...';
    }, 2000);

    setTimeout(() => {
      const p = activeUpdates.get(updateId);
      if (!p) return;
      
      p.status = 'installing';
      p.progress = 75;
      p.message = 'Installing update...';
    }, 3000);

    setTimeout(() => {
      const p = activeUpdates.get(updateId);
      if (!p) return;
      
      p.status = 'completed';
      p.progress = 100;
      p.message = 'Update installed successfully';
      p.completedAt = new Date().toISOString();

      // Add to history
      updateHistory.unshift({
        id: updateHistoryIdCounter++,
        version: p.version,
        installedDate: p.completedAt,
        status: 'success',
        branch: 'main',
      });

      // Remove from active after a while
      setTimeout(() => {
        activeUpdates.delete(updateId);
      }, 60000);
    }, 5000);

    return sendSuccess(reply, {
      updateId,
      version,
      startedAt,
      status: 'queued' as InstallStatus,
    }, 202);
  });

  // GET /api/updates/progress/:updateId
  app.get('/api/updates/progress/:updateId', async (request, reply) => {
    const params = request.params as { updateId?: string };
    const updateId = params.updateId;

    if (!updateId) {
      throw new NotFoundError('Update ID is required');
    }

    const progress = activeUpdates.get(updateId);
    if (!progress) {
      throw new NotFoundError(`Update with id "${updateId}" not found`);
    }

    return sendSuccess(reply, progress);
  });
}
