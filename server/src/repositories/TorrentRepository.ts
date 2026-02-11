import { PrismaClient, Torrent, TorrentPeer } from '@prisma/client';

export type TorrentWithPeers = Torrent & { peers: TorrentPeer[] };

export class TorrentRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Upserts a torrent record based on its infoHash.
   */
  async upsert(data: Omit<Torrent, 'id' | 'added'>): Promise<Torrent> {
    return this.prisma.torrent.upsert({
      where: { infoHash: data.infoHash },
      update: data,
      create: data,
    });
  }

  /**
   * Finds a torrent by its infoHash, including its peers.
   */
  async findByInfoHash(infoHash: string): Promise<TorrentWithPeers | null> {
    return this.prisma.torrent.findUnique({
      where: { infoHash },
      include: { peers: true },
    });
  }

  /**
   * Retrieves all torrents from the database.
   */
  async findAll(): Promise<Torrent[]> {
    return this.prisma.torrent.findMany({
      orderBy: { added: 'desc' },
    });
  }

  /**
   * Updates the status of a torrent.
   */
  async updateStatus(infoHash: string, status: string): Promise<Torrent> {
    return this.prisma.torrent.update({
      where: { infoHash },
      data: { status },
    });
  }

  /**
   * Updates the progress and speeds of a torrent.
   */
  async updateProgress(
    infoHash: string,
    progress: number,
    downloadSpeed: number,
    uploadSpeed: number,
    downloaded: bigint,
    uploaded: bigint,
    eta: number | null
  ): Promise<Torrent> {
    return this.prisma.torrent.update({
      where: { infoHash },
      data: {
        progress,
        downloadSpeed,
        uploadSpeed,
        downloaded,
        uploaded,
        eta,
      },
    });
  }

  /**
   * Deletes a torrent and its associated peers.
   */
  async delete(infoHash: string): Promise<Torrent> {
    // Delete peers first (Prisma handles this if cascade is set, but explicit is safer if not sure)
    await this.prisma.torrentPeer.deleteMany({
      where: { torrent: { infoHash } },
    });
    return this.prisma.torrent.delete({
      where: { infoHash },
    });
  }

  /**
   * Synchronizes peers for a torrent.
   */
  async syncPeers(infoHash: string, peers: Omit<TorrentPeer, 'id' | 'torrentId'>[]): Promise<void> {
    const torrent = await this.prisma.torrent.findUnique({ where: { infoHash } });
    if (!torrent) return;

    await this.prisma.torrentPeer.deleteMany({ where: { torrentId: torrent.id } });
    await this.prisma.torrentPeer.createMany({
      data: peers.map(p => ({ ...p, torrentId: torrent.id })),
    });
  }
}
