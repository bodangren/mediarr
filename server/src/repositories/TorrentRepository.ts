import { asc, desc, eq, inArray } from 'drizzle-orm';
import type { DatabaseClient } from '../db/drizzleClient';
import * as schema from '../db/schema';
import type { Torrent, TorrentPeer } from '../types/modelTypes';

export type TorrentWithPeers = Torrent & { peers: TorrentPeer[] };

export interface TorrentInsertInput {
  infoHash: string;
  name: string;
  status: string;
  progress?: number;
  downloadSpeed?: number;
  uploadSpeed?: number;
  eta?: number | null;
  size: number;
  downloaded?: number;
  uploaded?: number;
  ratio?: number;
  path: string;
  completedAt?: Date | null;
  stopAtRatio?: number | null;
  stopAtTime?: number | null;
  magnetUrl?: string | null;
  torrentFile?: Uint8Array | null;
  episodeId?: number | null;
  movieId?: number | null;
  priority?: number;
}

export interface TorrentPeerInput {
  ip: string;
  port: number;
  client?: string | null;
}

export class TorrentRepository {
  constructor(private prisma: DatabaseClient) {}

  private normalizeInfoHash(infoHash: string): string {
    return infoHash.trim().toLowerCase();
  }

  /**
   * Upserts a torrent record based on its infoHash.
   */
  async upsert(data: TorrentInsertInput): Promise<Torrent> {
    const normalizedInfoHash = this.normalizeInfoHash(data.infoHash);
    const insertValues = {
      infoHash: normalizedInfoHash,
      name: data.name,
      status: data.status,
      progress: data.progress ?? 0,
      downloadSpeed: data.downloadSpeed ?? 0,
      uploadSpeed: data.uploadSpeed ?? 0,
      eta: data.eta ?? null,
      size: data.size,
      downloaded: data.downloaded ?? 0,
      uploaded: data.uploaded ?? 0,
      ratio: data.ratio ?? 0,
      path: data.path,
      completedAt: data.completedAt ?? null,
      stopAtRatio: data.stopAtRatio ?? null,
      stopAtTime: data.stopAtTime ?? null,
      magnetUrl: data.magnetUrl ?? null,
      torrentFile: data.torrentFile ?? null,
      episodeId: data.episodeId ?? null,
      movieId: data.movieId ?? null,
    } as const;
    const [row] = await this.prisma.drizzle
      .insert(schema.torrents)
      .values(insertValues)
      .onConflictDoUpdate({
        target: schema.torrents.infoHash,
        set: insertValues,
      })
      .returning();
    if (!row) {
      throw new Error('TorrentRepository.upsert: returned no row');
    }
    return row as Torrent;
  }

  /**
   * Finds a torrent by its infoHash, including its peers.
   */
  async findByInfoHash(infoHash: string): Promise<TorrentWithPeers | null> {
    const torrentRows = await this.prisma.drizzle
      .select()
      .from(schema.torrents)
      .where(eq(schema.torrents.infoHash, this.normalizeInfoHash(infoHash)))
      .limit(1);
    const torrent = torrentRows[0];
    if (!torrent) return null;

    const peers = await this.prisma.drizzle
      .select()
      .from(schema.torrentPeers)
      .where(eq(schema.torrentPeers.torrentId, torrent.id));

    return { ...torrent, peers: peers as unknown as TorrentPeer[] };
  }

  /**
   * Retrieves all torrents from the database.
   */
  async findAll(): Promise<Torrent[]> {
    return this.prisma.drizzle
      .select()
      .from(schema.torrents)
      .orderBy(desc(schema.torrents.added)) as unknown as Promise<Torrent[]>;
  }

  /**
   * Counts torrents with a given status.
   */
  async countByStatus(status: string): Promise<number> {
    const rows = await this.prisma.drizzle
      .select({ id: schema.torrents.id })
      .from(schema.torrents)
      .where(eq(schema.torrents.status, status));
    return rows.length;
  }

  /**
   * Returns the oldest queued torrent (FIFO order) or null if none exist.
   */
  async findOldestQueued(): Promise<Torrent | null> {
    const rows = await this.prisma.drizzle
      .select()
      .from(schema.torrents)
      .where(eq(schema.torrents.status, 'queued'))
      .orderBy(asc(schema.torrents.added))
      .limit(1);
    return (rows[0] as Torrent | undefined) ?? null;
  }

  /**
   * Retrieves torrents matching any of the given statuses.
   */
  async findByStatuses(statuses: string[]): Promise<Torrent[]> {
    if (statuses.length === 0) return [];
    return this.prisma.drizzle
      .select()
      .from(schema.torrents)
      .where(inArray(schema.torrents.status, statuses))
      .orderBy(desc(schema.torrents.added)) as unknown as Promise<Torrent[]>;
  }

  /**
   * Updates the status of a torrent.
   */
  async updateStatus(infoHash: string, status: string): Promise<Torrent> {
    const rows = await this.prisma.drizzle
      .update(schema.torrents)
      .set({ status })
      .where(eq(schema.torrents.infoHash, this.normalizeInfoHash(infoHash)))
      .returning();
    const updated = rows[0];
    if (!updated) {
      throw new Error(`TorrentRepository.updateStatus: torrent ${infoHash} not found`);
    }
    return updated as Torrent;
  }

  /**
   * Updates multiple fields of a torrent.
   */
  async update(
    infoHash: string,
    data: Partial<Omit<TorrentInsertInput, 'infoHash'>>
  ): Promise<Torrent> {
    const rows = await this.prisma.drizzle
      .update(schema.torrents)
      .set(data as Record<string, unknown>)
      .where(eq(schema.torrents.infoHash, this.normalizeInfoHash(infoHash)))
      .returning();
    const updated = rows[0];
    if (!updated) {
      throw new Error(`TorrentRepository.update: torrent ${infoHash} not found`);
    }
    return updated as Torrent;
  }

  /**
   * Updates the progress and speeds of a torrent.
   */
  async updateProgress(
    infoHash: string,
    progress: number,
    downloadSpeed: number,
    uploadSpeed: number,
    downloaded: number,
    uploaded: number,
    ratio: number,
    eta: number | null
  ): Promise<Torrent> {
    const rows = await this.prisma.drizzle
      .update(schema.torrents)
      .set({
        progress,
        downloadSpeed,
        uploadSpeed,
        downloaded,
        uploaded,
        ratio,
        eta,
      })
      .where(eq(schema.torrents.infoHash, this.normalizeInfoHash(infoHash)))
      .returning();
    const updated = rows[0];
    if (!updated) {
      throw new Error(`TorrentRepository.updateProgress: torrent ${infoHash} not found`);
    }
    return updated as Torrent;
  }

  /**
   * Deletes a torrent and its associated peers.
   */
  async delete(infoHash: string): Promise<Torrent> {
    const normalizedInfoHash = this.normalizeInfoHash(infoHash);
    const torrentRows = await this.prisma.drizzle
      .select({ id: schema.torrents.id })
      .from(schema.torrents)
      .where(eq(schema.torrents.infoHash, normalizedInfoHash))
      .limit(1);
    const torrent = torrentRows[0];
    if (!torrent) {
      throw new Error(`TorrentRepository.delete: torrent ${infoHash} not found`);
    }
    await this.prisma.drizzle
      .delete(schema.torrentPeers)
      .where(eq(schema.torrentPeers.torrentId, torrent.id));
    const rows = await this.prisma.drizzle
      .delete(schema.torrents)
      .where(eq(schema.torrents.infoHash, normalizedInfoHash))
      .returning();
    const deleted = rows[0];
    if (!deleted) {
      throw new Error(`TorrentRepository.delete: torrent ${infoHash} not found`);
    }
    return deleted as Torrent;
  }

  /**
   * Synchronizes peers for a torrent.
   */
  async syncPeers(infoHash: string, peers: TorrentPeerInput[]): Promise<void> {
    const torrentRows = await this.prisma.drizzle
      .select({ id: schema.torrents.id })
      .from(schema.torrents)
      .where(eq(schema.torrents.infoHash, this.normalizeInfoHash(infoHash)))
      .limit(1);
    const torrent = torrentRows[0];
    if (!torrent) return;

    await this.prisma.drizzle
      .delete(schema.torrentPeers)
      .where(eq(schema.torrentPeers.torrentId, torrent.id));
    if (peers.length > 0) {
      const peerRows = peers.map((p) => ({
        torrentId: torrent.id,
        ip: p.ip,
        port: p.port,
        client: p.client ?? null,
      }));
      await this.prisma.drizzle.insert(schema.torrentPeers).values(peerRows);
    }
  }
}