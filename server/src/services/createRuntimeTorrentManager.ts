import type { TorrentRepository } from '../repositories/TorrentRepository';
import type { TorrentManager } from './TorrentManager';

export interface TorrentRuntimePaths {
  incomplete?: string;
  complete?: string;
  seedRatioLimit?: number;
  seedTimeLimitMinutes?: number;
  seedLimitAction?: 'pause' | 'remove';
  maxActiveDownloads?: number;
}

interface TorrentManagerModule {
  TorrentManager: {
    getInstance(repository: TorrentRepository): TorrentManager;
  };
}

type TorrentManagerLoader = () => Promise<TorrentManagerModule>;

/** Initialize the real torrent engine or reject startup; no inert fallback is permitted. */
export async function createRuntimeTorrentManager(
  repository: TorrentRepository,
  paths?: TorrentRuntimePaths,
  loadManager: TorrentManagerLoader = () => import('./TorrentManager'),
): Promise<TorrentManager> {
  const module = await loadManager();
  const manager = module.TorrentManager.getInstance(repository);
  if (paths) {
    manager.setDownloadPaths(paths);
  }
  await manager.initialize();
  return manager;
}
