import { PrismaClient, Torrent, TorrentPeer } from '@prisma/client';

export type TorrentWithPeers = Torrent & { peers: TorrentPeer[] };

export class TorrentRepository {
  constructor(private prisma: PrismaClient) {}

  private normalizeInfoHash(infoHash: string): string {
    return infoHash.trim().toLowerCase();
  }

  /**
   * Upserts a torrent record based on its infoHash.
   */
  async upsert(data: Omit<Torrent, 'id' | 'added'>): Promise<Torrent> {
    const normalizedInfoHash = this.normalizeInfoHash(data.infoHash);
    return this.prisma.torrent.upsert({
      where: { infoHash: normalizedInfoHash },
      update: {
        ...data,
        infoHash: normalizedInfoHash,
      },
      create: {
        ...data,
        infoHash: normalizedInfoHash,
      },
    });
  }

  /**
   * Finds a torrent by its infoHash, including its peers.
   */
  async findByInfoHash(infoHash: string): Promise<TorrentWithPeers | null> {
    return this.prisma.torrent.findUnique({
      where: { infoHash: this.normalizeInfoHash(infoHash) },
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
   * Counts torrents with a given status.
   */
  async countByStatus(status: string): Promise<number> {
    return this.prisma.torrent.count({ where: { status } });
  }

  /**
   * Returns the oldest queued torrent (FIFO order) or null if none exist.
   */
  async findOldestQueued(): Promise<Torrent | null> {
    const results = await this.prisma.torrent.findMany({
      where: { status: 'queued' },
      orderBy: { added: 'asc' },
      take: 1,
    });
    return results[0] ?? null;
  }

  /**
   * Retrieves torrents matching any of the given statuses.
   */
  async findByStatuses(statuses: string[]): Promise<Torrent[]> {
    return this.prisma.torrent.findMany({
      where: { status: { in: statuses } },
      orderBy: { added: 'desc' },
    });
  }

  /**
   * Updates the status of a torrent.
   */
  async updateStatus(infoHash: string, status: string): Promise<Torrent> {
    return this.prisma.torrent.update({
      where: { infoHash: this.normalizeInfoHash(infoHash) },
      data: { status },
    });
  }

  /**
   * Updates multiple fields of a torrent.
   */
  async update(
    infoHash: string,
    data: Partial<Omit<Torrent, 'id' | 'added' | 'infoHash'>>
  ): Promise<Torrent> {
    return this.prisma.torrent.update({
      where: { infoHash: this.normalizeInfoHash(infoHash) },
      data,
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
    ratio: number,
    eta: number | null
  ): Promise<Torrent> {
    return this.prisma.torrent.update({
      where: { infoHash: this.normalizeInfoHash(infoHash) },
      data: {
        progress,
        downloadSpeed,
        uploadSpeed,
        downloaded,
        uploaded,
        ratio,
        eta,
      },
    });
  }

  /**
   * Deletes a torrent and its associated peers.
   */
  async delete(infoHash: string): Promise<Torrent> {
    const normalizedInfoHash = this.normalizeInfoHash(infoHash);
    // Delete peers first (Prisma handles this if cascade is set, but explicit is safer if not sure)
    await this.prisma.torrentPeer.deleteMany({
      where: { torrent: { infoHash: normalizedInfoHash } },
    });
    return this.prisma.torrent.delete({
      where: { infoHash: normalizedInfoHash },
    });
  }

  /**
   * Synchronizes peers for a torrent.
   */
  async syncPeers(infoHash: string, peers: Omit<TorrentPeer, 'id' | 'torrentId'>[]): Promise<void> {
    const torrent = await this.prisma.torrent.findUnique({
      where: { infoHash: this.normalizeInfoHash(infoHash) },
    });
    if (!torrent) return;

    await this.prisma.torrentPeer.deleteMany({ where: { torrentId: torrent.id } });
    await this.prisma.torrentPeer.createMany({
      data: peers.map(p => ({ ...p, torrentId: torrent.id })),
    });
  }
}
