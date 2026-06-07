import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TorrentRepository } from './TorrentRepository';

function makeDb() {
  return {
    torrent: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    torrentPeer: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
  };
}

describe('TorrentRepository.normalizeInfoHash', () => {
  it('trims and lowercases infoHash', async () => {
    const prisma = makeDb();
    prisma.torrent.upsert.mockResolvedValue({ infoHash: 'abc123' });
    const repo = new TorrentRepository(prisma as any);

    await repo.upsert({
      infoHash: '  ABC123  ',
      name: 'Test',
      status: 'downloading',
      totalSize: BigInt(1000),
      downloadSpeed: 0,
      uploadSpeed: 0,
      downloaded: BigInt(0),
      uploaded: BigInt(0),
      ratio: 0,
      eta: null,
    });

    expect(prisma.torrent.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { infoHash: 'abc123' },
        create: expect.objectContaining({ infoHash: 'abc123' }),
        update: expect.objectContaining({ infoHash: 'abc123' }),
      }),
    );
  });
});

describe('TorrentRepository.upsert', () => {
  let prisma: ReturnType<typeof makeDb>;
  let repo: TorrentRepository;

  beforeEach(() => {
    prisma = makeDb();
    repo = new TorrentRepository(prisma as any);
  });

  it('creates a new torrent when infoHash does not exist', async () => {
    prisma.torrent.upsert.mockResolvedValue({ infoHash: 'abc123', name: 'New' });

    const result = await repo.upsert({
      infoHash: 'abc123',
      name: 'New',
      status: 'downloading',
      totalSize: BigInt(1000),
      downloadSpeed: 0,
      uploadSpeed: 0,
      downloaded: BigInt(0),
      uploaded: BigInt(0),
      ratio: 0,
      eta: null,
    });

    expect(prisma.torrent.upsert).toHaveBeenCalledTimes(1);
    expect(result.infoHash).toBe('abc123');
  });

  it('updates existing torrent when infoHash matches', async () => {
    prisma.torrent.upsert.mockResolvedValue({ infoHash: 'abc123', name: 'Updated', status: 'seeding' });

    const result = await repo.upsert({
      infoHash: 'abc123',
      name: 'Updated',
      status: 'seeding',
      totalSize: BigInt(2000),
      downloadSpeed: 0,
      uploadSpeed: 100,
      downloaded: BigInt(2000),
      uploaded: BigInt(500),
      ratio: 0.25,
      eta: null,
    });

    expect(prisma.torrent.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ name: 'Updated', status: 'seeding' }),
      }),
    );
    expect(result.status).toBe('seeding');
  });
});

describe('TorrentRepository.findByInfoHash', () => {
  it('returns torrent with peers when found', async () => {
    const prisma = makeDb();
    prisma.torrent.findUnique.mockResolvedValue({ infoHash: 'abc123', peers: [{ ip: '1.2.3.4' }] });
    const repo = new TorrentRepository(prisma as any);

    const result = await repo.findByInfoHash('abc123');

    expect(result).not.toBeNull();
    expect(result!.infoHash).toBe('abc123');
    expect(result!.peers).toHaveLength(1);
  });

  it('returns null when torrent not found', async () => {
    const prisma = makeDb();
    prisma.torrent.findUnique.mockResolvedValue(null);
    const repo = new TorrentRepository(prisma as any);

    const result = await repo.findByInfoHash('nonexistent');

    expect(result).toBeNull();
  });
});

describe('TorrentRepository.delete', () => {
  it('deletes peers before deleting torrent', async () => {
    const prisma = makeDb();
    prisma.torrent.delete.mockResolvedValue({ infoHash: 'abc123' });
    const repo = new TorrentRepository(prisma as any);

    await repo.delete('abc123');

    expect(prisma.torrentPeer.deleteMany).toHaveBeenCalledWith({
      where: { torrent: { infoHash: 'abc123' } },
    });
    expect(prisma.torrent.delete).toHaveBeenCalledWith({ where: { infoHash: 'abc123' } });
  });
});

describe('TorrentRepository.syncPeers', () => {
  it('is a no-op when torrent does not exist', async () => {
    const prisma = makeDb();
    prisma.torrent.findUnique.mockResolvedValue(null);
    const repo = new TorrentRepository(prisma as any);

    await repo.syncPeers('nonexistent', [{ ip: '1.2.3.4', port: 1234, uploaded: 0, downloaded: 0 }]);

    expect(prisma.torrentPeer.deleteMany).not.toHaveBeenCalled();
    expect(prisma.torrentPeer.createMany).not.toHaveBeenCalled();
  });

  it('deletes old peers and creates new ones', async () => {
    const prisma = makeDb();
    prisma.torrent.findUnique.mockResolvedValue({ id: 1, infoHash: 'abc123' });
    const repo = new TorrentRepository(prisma as any);

    const peers = [
      { ip: '1.2.3.4', port: 1234, uploaded: BigInt(100), downloaded: BigInt(200) },
      { ip: '5.6.7.8', port: 5678, uploaded: BigInt(0), downloaded: BigInt(0) },
    ];

    await repo.syncPeers('abc123', peers);

    expect(prisma.torrentPeer.deleteMany).toHaveBeenCalledWith({ where: { torrentId: 1 } });
    expect(prisma.torrentPeer.createMany).toHaveBeenCalledWith({
      data: [
        { ip: '1.2.3.4', port: 1234, uploaded: BigInt(100), downloaded: BigInt(200), torrentId: 1 },
        { ip: '5.6.7.8', port: 5678, uploaded: BigInt(0), downloaded: BigInt(0), torrentId: 1 },
      ],
    });
  });

  it('handles empty peers array (clears all peers)', async () => {
    const prisma = makeDb();
    prisma.torrent.findUnique.mockResolvedValue({ id: 1, infoHash: 'abc123' });
    const repo = new TorrentRepository(prisma as any);

    await repo.syncPeers('abc123', []);

    expect(prisma.torrentPeer.deleteMany).toHaveBeenCalledWith({ where: { torrentId: 1 } });
    expect(prisma.torrentPeer.createMany).toHaveBeenCalledWith({ data: [] });
  });
});

describe('TorrentRepository.findOldestQueued', () => {
  it('returns the oldest queued torrent', async () => {
    const prisma = makeDb();
    prisma.torrent.findMany.mockResolvedValue([{ infoHash: 'old', added: new Date('2020-01-01') }]);
    const repo = new TorrentRepository(prisma as any);

    const result = await repo.findOldestQueued();

    expect(result).not.toBeNull();
    expect(result!.infoHash).toBe('old');
  });

  it('returns null when no queued torrents exist', async () => {
    const prisma = makeDb();
    prisma.torrent.findMany.mockResolvedValue([]);
    const repo = new TorrentRepository(prisma as any);

    const result = await repo.findOldestQueued();

    expect(result).toBeNull();
  });

  it('queries with status=queued, ordered by added asc, take 1', async () => {
    const prisma = makeDb();
    prisma.torrent.findMany.mockResolvedValue([]);
    const repo = new TorrentRepository(prisma as any);

    await repo.findOldestQueued();

    expect(prisma.torrent.findMany).toHaveBeenCalledWith({
      where: { status: 'queued' },
      orderBy: { added: 'asc' },
      take: 1,
    });
  });
});

describe('TorrentRepository.findByStatuses', () => {
  it('queries with status { in: [...] }', async () => {
    const prisma = makeDb();
    prisma.torrent.findMany.mockResolvedValue([]);
    const repo = new TorrentRepository(prisma as any);

    await repo.findByStatuses(['downloading', 'seeding']);

    expect(prisma.torrent.findMany).toHaveBeenCalledWith({
      where: { status: { in: ['downloading', 'seeding'] } },
      orderBy: { added: 'desc' },
    });
  });
});

describe('TorrentRepository.updateProgress', () => {
  it('passes all fields to update', async () => {
    const prisma = makeDb();
    prisma.torrent.update.mockResolvedValue({ infoHash: 'abc' });
    const repo = new TorrentRepository(prisma as any);

    await repo.updateProgress('abc', 0.5, 1000, 500, BigInt(5000), BigInt(2500), 0.5, 120);

    expect(prisma.torrent.update).toHaveBeenCalledWith({
      where: { infoHash: 'abc' },
      data: {
        progress: 0.5,
        downloadSpeed: 1000,
        uploadSpeed: 500,
        downloaded: BigInt(5000),
        uploaded: BigInt(2500),
        ratio: 0.5,
        eta: 120,
      },
    });
  });

  it('handles null eta', async () => {
    const prisma = makeDb();
    prisma.torrent.update.mockResolvedValue({ infoHash: 'abc' });
    const repo = new TorrentRepository(prisma as any);

    await repo.updateProgress('abc', 1.0, 0, 0, BigInt(10000), BigInt(10000), 1.0, null);

    expect(prisma.torrent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ eta: null }),
      }),
    );
  });
});

describe('TorrentRepository.countByStatus', () => {
  it('delegates to prisma.torrent.count', async () => {
    const prisma = makeDb();
    prisma.torrent.count.mockResolvedValue(5);
    const repo = new TorrentRepository(prisma as any);

    const result = await repo.countByStatus('downloading');

    expect(result).toBe(5);
    expect(prisma.torrent.count).toHaveBeenCalledWith({ where: { status: 'downloading' } });
  });
});
