import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TorrentRepository } from './TorrentRepository';
import * as schema from '../db/schema';

type SelectCall = { table?: any; rows: any[] };

function makeSelectBuilder(rows: any[] = []): any {
  const builder: any = {
    then: (resolve: any, reject: any) => Promise.resolve(rows).then(resolve, reject),
  };
  builder.from = vi.fn().mockReturnValue(builder);
  builder.where = vi.fn().mockReturnValue(builder);
  builder.orderBy = vi.fn().mockReturnValue(builder);
  builder.limit = vi.fn().mockReturnValue(builder);
  return builder;
}

function makeInsertBuilder(returningRows: any[] = []): any {
  const builder: any = {};
  builder.values = vi.fn().mockReturnValue(builder);
  builder.onConflictDoUpdate = vi.fn().mockReturnValue(builder);
  builder.returning = vi.fn().mockResolvedValue(returningRows);
  return builder;
}

function makeUpdateBuilder(returningRows: any[] = []): any {
  const builder: any = {};
  builder.set = vi.fn().mockReturnValue(builder);
  builder.where = vi.fn().mockReturnValue(builder);
  builder.returning = vi.fn().mockResolvedValue(returningRows);
  return builder;
}

function makeDeleteBuilder(returningRows: any[] = []): any {
  const builder: any = {};
  builder.where = vi.fn().mockReturnValue(builder);
  builder.returning = vi.fn().mockResolvedValue(returningRows);
  return builder;
}

function makeDb(config: { selectCalls?: SelectCall[]; insertRows?: any[]; updateRows?: any[]; deleteRows?: any[] } = {}) {
  const selectCalls = config.selectCalls ?? [];
  const selectIndex = { i: 0 };
  return {
    drizzle: {
      select: vi.fn().mockImplementation(() => {
        const call = selectCalls[selectIndex.i] ?? { table: null, rows: [] };
        selectIndex.i += 1;
        return makeSelectBuilder(call.rows);
      }),
      insert: vi.fn().mockImplementation((table: any) => {
        return makeInsertBuilder(config.insertRows ?? [{ id: 1, infoHash: 'abc' }]);
      }),
      update: vi.fn().mockImplementation((table: any) => {
        return makeUpdateBuilder(config.updateRows ?? [{ id: 1, infoHash: 'abc' }]);
      }),
      delete: vi.fn().mockImplementation((table: any) => {
        return makeDeleteBuilder(config.deleteRows ?? [{ id: 1, infoHash: 'abc' }]);
      }),
    },
  };
}

const baseTorrentInput = {
  infoHash: '  ABC123  ',
  name: 'Test',
  status: 'downloading',
  path: '/downloads/test',
  size: 1000,
  downloadSpeed: 0,
  uploadSpeed: 0,
  downloaded: 0,
  uploaded: 0,
  ratio: 0,
  eta: null,
};

describe('TorrentRepository.normalizeInfoHash', () => {
  it('trims and lowercases infoHash on insert', async () => {
    const db = makeDb({ insertRows: [{ id: 1, infoHash: 'abc123' }] });
    const repo = new TorrentRepository(db as any);
    await repo.upsert(baseTorrentInput as any);
    const insert = db.drizzle.insert.mock.results[0]?.value;
    const valuesArg = insert?.values.mock.calls[0]?.[0];
    expect(valuesArg.infoHash).toBe('abc123');
    const conflictArg = insert?.onConflictDoUpdate.mock.calls[0]?.[0];
    expect(conflictArg.set.infoHash).toBe('abc123');
  });
});

describe('TorrentRepository.upsert', () => {
  it('returns the upserted row', async () => {
    const db = makeDb({ insertRows: [{ id: 1, infoHash: 'abc123', name: 'New' }] });
    const repo = new TorrentRepository(db as any);
    const result = await repo.upsert({ ...baseTorrentInput, infoHash: 'abc123', name: 'New' } as any);
    expect(result.infoHash).toBe('abc123');
    expect(result.name).toBe('New');
  });

  it('uses onConflictDoUpdate keyed on infoHash', async () => {
    const db = makeDb({ insertRows: [{ id: 1 }] });
    const repo = new TorrentRepository(db as any);
    await repo.upsert({ ...baseTorrentInput, infoHash: 'abc123', name: 'Updated' } as any);
    const insert = db.drizzle.insert.mock.results[0]?.value;
    const conflictArg = insert?.onConflictDoUpdate.mock.calls[0]?.[0];
    expect(conflictArg.target).toBe(schema.torrents.infoHash);
    expect(conflictArg.set.name).toBe('Updated');
  });

  it('throws when the insert returns no row', async () => {
    const db = makeDb({ insertRows: [] });
    const repo = new TorrentRepository(db as any);
    await expect(repo.upsert(baseTorrentInput as any)).rejects.toThrow(/returned no row/);
  });
});

describe('TorrentRepository.findByInfoHash', () => {
  it('returns the torrent with its peers when found', async () => {
    const db = makeDb({
      selectCalls: [
        { rows: [{ id: 1, infoHash: 'abc123', name: 'Test' }] },
        { rows: [{ id: 10, torrentId: 1, ip: '1.2.3.4', port: 6881 }] },
      ],
    });
    const repo = new TorrentRepository(db as any);
    const result = await repo.findByInfoHash('abc123');
    expect(result).not.toBeNull();
    expect(result!.infoHash).toBe('abc123');
    expect(result!.peers).toHaveLength(1);
    expect(result!.peers[0]!.ip).toBe('1.2.3.4');
  });

  it('returns null when torrent is not found', async () => {
    const db = makeDb({ selectCalls: [{ rows: [] }] });
    const repo = new TorrentRepository(db as any);
    const result = await repo.findByInfoHash('missing');
    expect(result).toBeNull();
  });
});

describe('TorrentRepository.findAll', () => {
  it('selects all torrents ordered by added desc', async () => {
    const db = makeDb({ selectCalls: [{ rows: [{ id: 1 }, { id: 2 }] }] });
    const repo = new TorrentRepository(db as any);
    const result = await repo.findAll();
    expect(result).toHaveLength(2);
    const select = db.drizzle.select.mock.results[0]?.value;
    expect(select?.from).toHaveBeenCalledWith(schema.torrents);
    expect(select?.orderBy).toHaveBeenCalled();
  });
});

describe('TorrentRepository.findOldestQueued', () => {
  it('returns the oldest queued torrent', async () => {
    const db = makeDb({ selectCalls: [{ rows: [{ id: 1, infoHash: 'old', added: new Date('2020-01-01') }] }] });
    const repo = new TorrentRepository(db as any);
    const result = await repo.findOldestQueued();
    expect(result).not.toBeNull();
    expect(result!.infoHash).toBe('old');
  });

  it('returns null when no queued torrents exist', async () => {
    const db = makeDb({ selectCalls: [{ rows: [] }] });
    const repo = new TorrentRepository(db as any);
    const result = await repo.findOldestQueued();
    expect(result).toBeNull();
  });

  it('queries with status=queued', async () => {
    const db = makeDb({ selectCalls: [{ rows: [] }] });
    const repo = new TorrentRepository(db as any);
    await repo.findOldestQueued();
    const select = db.drizzle.select.mock.results[0]?.value;
    expect(select?.where).toHaveBeenCalled();
  });
});

describe('TorrentRepository.findByStatuses', () => {
  it('returns empty array for empty input', async () => {
    const db = makeDb();
    const repo = new TorrentRepository(db as any);
    const result = await repo.findByStatuses([]);
    expect(result).toEqual([]);
  });

  it('selects torrents with status in the given list', async () => {
    const db = makeDb({ selectCalls: [{ rows: [{ id: 1, status: 'downloading' }] }] });
    const repo = new TorrentRepository(db as any);
    const result = await repo.findByStatuses(['downloading', 'seeding']);
    expect(result).toHaveLength(1);
  });
});

describe('TorrentRepository.updateStatus', () => {
  it('updates the status and returns the row', async () => {
    const db = makeDb({ updateRows: [{ id: 1, infoHash: 'abc', status: 'seeding' }] });
    const repo = new TorrentRepository(db as any);
    const result = await repo.updateStatus('abc', 'seeding');
    expect(result.status).toBe('seeding');
  });

  it('throws when torrent is not found', async () => {
    const db = makeDb({ updateRows: [] });
    const repo = new TorrentRepository(db as any);
    await expect(repo.updateStatus('missing', 'seeding')).rejects.toThrow(/not found/);
  });
});

describe('TorrentRepository.update', () => {
  it('updates multiple fields and returns the row', async () => {
    const db = makeDb({ updateRows: [{ id: 1, infoHash: 'abc', name: 'Renamed' }] });
    const repo = new TorrentRepository(db as any);
    const result = await repo.update('abc', { name: 'Renamed' });
    expect(result.name).toBe('Renamed');
  });
});

describe('TorrentRepository.updateProgress', () => {
  it('passes all fields to update', async () => {
    const db = makeDb({ updateRows: [{ id: 1, infoHash: 'abc' }] });
    const repo = new TorrentRepository(db as any);
    await repo.updateProgress('abc', 0.5, 1000, 500, 5000, 2500, 0.5, 120);
    const update = db.drizzle.update.mock.results[0]?.value;
    expect(update?.set).toHaveBeenCalledWith({
      progress: 0.5,
      downloadSpeed: 1000,
      uploadSpeed: 500,
      downloaded: 5000,
      uploaded: 2500,
      ratio: 0.5,
      eta: 120,
    });
  });

  it('handles null eta', async () => {
    const db = makeDb({ updateRows: [{ id: 1 }] });
    const repo = new TorrentRepository(db as any);
    await repo.updateProgress('abc', 1.0, 0, 0, 10000, 10000, 1.0, null);
    const update = db.drizzle.update.mock.results[0]?.value;
    expect(update?.set).toHaveBeenCalledWith(expect.objectContaining({ eta: null }));
  });
});

describe('TorrentRepository.delete', () => {
  it('deletes peers before deleting the torrent', async () => {
    const db = makeDb({
      selectCalls: [{ rows: [{ id: 1, infoHash: 'abc' }] }],
      deleteRows: [{ id: 1, infoHash: 'abc' }],
    });
    const repo = new TorrentRepository(db as any);
    await repo.delete('abc');
    const deleteCalls = db.drizzle.delete.mock.calls;
    expect(deleteCalls[0]?.[0]).toBe(schema.torrentPeers);
    expect(deleteCalls[1]?.[0]).toBe(schema.torrents);
  });

  it('throws when torrent is not found', async () => {
    const db = makeDb({ selectCalls: [{ rows: [] }] });
    const repo = new TorrentRepository(db as any);
    await expect(repo.delete('missing')).rejects.toThrow(/not found/);
  });
});

describe('TorrentRepository.syncPeers', () => {
  it('is a no-op when torrent does not exist', async () => {
    const db = makeDb({ selectCalls: [{ rows: [] }] });
    const repo = new TorrentRepository(db as any);
    await repo.syncPeers('nonexistent', [{ ip: '1.2.3.4', port: 1234 }]);
    expect(db.drizzle.delete).not.toHaveBeenCalled();
    expect(db.drizzle.insert).not.toHaveBeenCalled();
  });

  it('deletes old peers and inserts new ones with torrentId', async () => {
    const db = makeDb({
      selectCalls: [{ rows: [{ id: 1, infoHash: 'abc' }] }],
    });
    const repo = new TorrentRepository(db as any);
    const peers = [
      { ip: '1.2.3.4', port: 1234, client: 'qBittorrent' },
      { ip: '5.6.7.8', port: 5678, client: null },
    ];
    await repo.syncPeers('abc', peers);
    const insert = db.drizzle.insert.mock.results[0]?.value;
    expect(insert?.values).toHaveBeenCalledWith([
      { torrentId: 1, ip: '1.2.3.4', port: 1234, client: 'qBittorrent' },
      { torrentId: 1, ip: '5.6.7.8', port: 5678, client: null },
    ]);
  });

  it('handles empty peers array (clears all peers)', async () => {
    const db = makeDb({
      selectCalls: [{ rows: [{ id: 1, infoHash: 'abc' }] }],
    });
    const repo = new TorrentRepository(db as any);
    await repo.syncPeers('abc', []);
    expect(db.drizzle.delete).toHaveBeenCalled();
    expect(db.drizzle.insert).not.toHaveBeenCalled();
  });
});

describe('TorrentRepository.countByStatus', () => {
  it('counts rows matching the status', async () => {
    const db = makeDb({ selectCalls: [{ rows: [{ id: 1 }, { id: 2 }, { id: 3 }] }] });
    const repo = new TorrentRepository(db as any);
    const result = await repo.countByStatus('downloading');
    expect(result).toBe(3);
  });

  it('returns 0 when no torrents match', async () => {
    const db = makeDb({ selectCalls: [{ rows: [] }] });
    const repo = new TorrentRepository(db as any);
    const result = await repo.countByStatus('paused');
    expect(result).toBe(0);
  });
});
