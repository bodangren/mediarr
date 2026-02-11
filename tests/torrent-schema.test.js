import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import 'dotenv/config';

const adapter = new PrismaBetterSqlite3({ url: 'file:prisma/dev.db' });
const prisma = new PrismaClient({ adapter });

describe('Torrent Schema', () => {
  beforeEach(async () => {
    await prisma.torrentPeer.deleteMany();
    await prisma.torrent.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should be able to create and retrieve a Torrent', async () => {
    const torrentData = {
      infoHash: 'abc123def456',
      name: 'Test Torrent',
      status: 'downloading',
      progress: 0.5,
      downloadSpeed: 1024.5,
      uploadSpeed: 512.2,
      eta: 3600,
      size: BigInt(1073741824), // 1 GB
      downloaded: BigInt(536870912), // 512 MB
      uploaded: BigInt(268435456), // 256 MB
      ratio: 0.5,
      path: '/data/downloads/incomplete',
    };

    const created = await prisma.torrent.create({
      data: torrentData,
    });

    expect(created.infoHash).toBe(torrentData.infoHash);
    expect(created.name).toBe(torrentData.name);
    // BigInts are returned as BigInts, so we can compare directly
    expect(created.size).toBe(torrentData.size);

    const retrieved = await prisma.torrent.findUnique({
      where: { infoHash: 'abc123def456' },
    });

    expect(retrieved).not.toBeNull();
    expect(retrieved.status).toBe('downloading');
  });

  it('should be able to create a Torrent with a Peer', async () => {
    const torrent = await prisma.torrent.create({
      data: {
        infoHash: 'peerhash123',
        name: 'Peer Test',
        status: 'seeding',
        size: BigInt(100),
        path: '/data/downloads/complete',
        peers: {
          create: {
            ip: '127.0.0.1',
            port: 6881,
            client: 'WebTorrent',
          },
        },
      },
      include: {
        peers: true,
      },
    });

    expect(torrent.peers).toHaveLength(1);
    expect(torrent.peers[0].ip).toBe('127.0.0.1');
    expect(torrent.peers[0].torrentId).toBe(torrent.id);
  });
});