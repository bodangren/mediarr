import { describe, expect, it, vi } from 'vitest';
import { createRuntimeTorrentManager } from './createRuntimeTorrentManager';

describe('createRuntimeTorrentManager', () => {
  it('fails daemon startup when the real torrent engine cannot initialize', async () => {
    const initialize = vi.fn().mockRejectedValue(new Error('webtorrent unavailable'));
    const getInstance = vi.fn().mockReturnValue({
      initialize,
      setDownloadPaths: vi.fn(),
    });

    await expect(createRuntimeTorrentManager(
      {} as never,
      { incomplete: '/data/downloads/incomplete' },
      async () => ({ TorrentManager: { getInstance } }) as never,
    )).rejects.toThrow(/webtorrent unavailable/i);

    expect(initialize).toHaveBeenCalledOnce();
  });
});
