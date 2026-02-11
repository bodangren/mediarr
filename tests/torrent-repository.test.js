import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { TorrentRepository } from '../server/src/repositories/TorrentRepository';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import 'dotenv/config';

const adapter = new PrismaBetterSqlite3({ url: 'file:prisma/dev.db' });
const prisma = new PrismaClient({ adapter });
const repository = new TorrentRepository(prisma);

describe('TorrentRepository', () => {
  beforeEach(async () => {
    await prisma.torrentPeer.deleteMany();
    await prisma.torrent.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should upsert a torrent', async () => {
    const torrentData = {
      infoHash: 'repo-test-hash',
      name: 'Repository Test Torrent',
      status: 'downloading',
      progress: 0.1,
      downloadSpeed: 500,
      uploadSpeed: 50,
      eta: 7200,
      size: BigInt(2000000000),
      downloaded: BigInt(200000000),
      uploaded: BigInt(0),
      ratio: 0,
      path: '/data/downloads/incomplete',
    };

    const created = await repository.upsert(torrentData);
    expect(created.infoHash).toBe(torrentData.infoHash);

    // Update with same infoHash
    const updatedData = { ...torrentData, progress: 0.2 };
    const updated = await repository.upsert(updatedData);
    expect(updated.progress).toBe(0.2);
    
    const count = await prisma.torrent.count();
    expect(count).toBe(1);
  });

  it('should find a torrent with peers', async () => {
    const torrent = await prisma.torrent.create({
      data: {
        infoHash: 'find-test-hash',
        name: 'Find Test',
        status: 'downloading',
        size: BigInt(1000),
        path: '/data/downloads/incomplete',
        peers: {
          create: { ip: '1.1.1.1', port: 1234, client: 'TestClient' }
        }
      }
    });

    const found = await repository.findByInfoHash('find-test-hash');
    expect(found).not.toBeNull();
    expect(found.peers).toHaveLength(1);
    expect(found.peers[0].ip).toBe('1.1.1.1');
  });

  it('should update progress', async () => {
    await prisma.torrent.create({
      data: {
        infoHash: 'progress-test-hash',
        name: 'Progress Test',
        status: 'downloading',
        size: BigInt(1000),
        path: '/data/downloads/incomplete',
      }
    });

    await repository.updateProgress(
      'progress-test-hash',
      0.5,
      1000,
      200,
      BigInt(500),
      BigInt(100),
      1800
    );

    const updated = await prisma.torrent.findUnique({ where: { infoHash: 'progress-test-hash' } });
    expect(updated.progress).toBe(0.5);
    expect(updated.downloaded).toBe(BigInt(500));
    expect(updated.eta).toBe(1800);
  });

  it('should sync peers', async () => {
    const torrent = await prisma.torrent.create({
      data: {
        infoHash: 'sync-peers-hash',
        name: 'Sync Peers Test',
        status: 'downloading',
        size: BigInt(1000),
        path: '/data/downloads/incomplete',
      }
    });

    const peers = [
      { ip: '2.2.2.2', port: 2222, client: 'ClientA' },
      { ip: '3.3.3.3', port: 3333, client: 'ClientB' },
    ];

    await repository.syncPeers('sync-peers-hash', peers);

    const found = await repository.findByInfoHash('sync-peers-hash');
    expect(found.peers).toHaveLength(2);
    expect(found.peers.map(p => p.ip)).toContain('2.2.2.2');
    expect(found.peers.map(p => p.ip)).toContain('3.3.3.3');

    // Sync again with new set
    await repository.syncPeers('sync-peers-hash', [{ ip: '4.4.4.4', port: 4444, client: 'ClientC' }]);
    const refetched = await repository.findByInfoHash('sync-peers-hash');
    expect(refetched.peers).toHaveLength(1);
    expect(refetched.peers[0].ip).toBe('4.4.4.4');
  });
});
