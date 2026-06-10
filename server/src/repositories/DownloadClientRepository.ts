import { and, asc, eq, ne } from 'drizzle-orm';
import type { DatabaseClient } from '../db/drizzleClient';
import * as schema from '../db/schema';
import type { DownloadClient } from '../types/modelTypes';
import { encrypt, decrypt } from '../utils/encryption';

export type DownloadClientProtocol = 'torrent' | 'usenet';
export type DownloadClientType =
  | 'qbittorrent'
  | 'transmission'
  | 'deluge'
  | 'rtorrent'
  | 'utorrent'
  | 'sabnzbd'
  | 'nzbget'
  | 'builtin';

export interface DownloadClientConfig {
  host: string;
  port: number;
  useSsl: boolean;
  username?: string;
  password?: string;
  apiKey?: string;
  category?: string;
  sequentialDownload?: boolean;
  firstLastPiecePriority?: boolean;
  torrentDirectory?: string;
  label?: string;
  directory?: string;
  tvCategory?: string;
  movieCategory?: string;
  recentTvPriority?: number;
  olderTvPriority?: number;
  recentMoviePriority?: number;
  olderMoviePriority?: number;
  nzbCategory?: string;
  priority?: number;
  addPaused?: boolean;
}

export interface CreateDownloadClientInput {
  name: string;
  protocol: DownloadClientProtocol;
  type: DownloadClientType;
  enabled?: boolean;
  priority?: number;
  config: DownloadClientConfig;
}

export interface UpdateDownloadClientInput {
  name?: string | undefined;
  protocol?: DownloadClientProtocol | undefined;
  type?: DownloadClientType | undefined;
  enabled?: boolean | undefined;
  priority?: number | undefined;
  config?: DownloadClientConfig | undefined;
}

export interface DownloadClientWithDecryptedConfig extends Omit<DownloadClient, 'config'> {
  config: DownloadClientConfig;
}

export class DownloadClientRepository {
  constructor(private prisma: DatabaseClient) {}

  private encryptConfig(config: DownloadClientConfig): string {
    return encrypt(JSON.stringify(config));
  }

  private decryptConfig(encryptedConfig: string): DownloadClientConfig {
    const decrypted = decrypt(encryptedConfig);
    try {
      return JSON.parse(decrypted) as DownloadClientConfig;
    } catch {
      return { host: '', port: 0, useSsl: false };
    }
  }

  private withDecryptedConfig(client: DownloadClient): DownloadClientWithDecryptedConfig {
    return {
      ...client,
      config: this.decryptConfig((client as { config: string }).config),
    };
  }

  async create(data: CreateDownloadClientInput): Promise<DownloadClientWithDecryptedConfig> {
    const [row] = await this.prisma.drizzle
      .insert(schema.downloadClients)
      .values({
        name: data.name,
        protocol: data.protocol,
        type: data.type,
        enabled: data.enabled ?? true,
        priority: data.priority ?? 25,
        config: this.encryptConfig(data.config),
      })
      .returning();
    if (!row) {
      throw new Error('DownloadClientRepository.create: returned no row');
    }
    return this.withDecryptedConfig(row as DownloadClient);
  }

  async findById(id: number): Promise<DownloadClientWithDecryptedConfig | null> {
    const rows = await this.prisma.drizzle
      .select()
      .from(schema.downloadClients)
      .where(eq(schema.downloadClients.id, id))
      .limit(1);
    const client = rows[0];
    if (!client) return null;
    return this.withDecryptedConfig(client as DownloadClient);
  }

  async findAll(): Promise<DownloadClientWithDecryptedConfig[]> {
    const rows = await this.prisma.drizzle
      .select()
      .from(schema.downloadClients)
      .orderBy(asc(schema.downloadClients.priority));
    return rows.map((row) => this.withDecryptedConfig(row as DownloadClient));
  }

  async findByProtocol(protocol: DownloadClientProtocol): Promise<DownloadClientWithDecryptedConfig[]> {
    const rows = await this.prisma.drizzle
      .select()
      .from(schema.downloadClients)
      .where(
        and(
          eq(schema.downloadClients.protocol, protocol),
          eq(schema.downloadClients.enabled, true),
        ),
      )
      .orderBy(asc(schema.downloadClients.priority));
    return rows.map((row) => this.withDecryptedConfig(row as DownloadClient));
  }

  async findEnabled(): Promise<DownloadClientWithDecryptedConfig[]> {
    const rows = await this.prisma.drizzle
      .select()
      .from(schema.downloadClients)
      .where(eq(schema.downloadClients.enabled, true))
      .orderBy(asc(schema.downloadClients.priority));
    return rows.map((row) => this.withDecryptedConfig(row as DownloadClient));
  }

  async update(id: number, data: UpdateDownloadClientInput): Promise<DownloadClientWithDecryptedConfig> {
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.protocol !== undefined) updateData.protocol = data.protocol;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.enabled !== undefined) updateData.enabled = data.enabled;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.config !== undefined) updateData.config = this.encryptConfig(data.config);

    const rows = await this.prisma.drizzle
      .update(schema.downloadClients)
      .set(updateData)
      .where(eq(schema.downloadClients.id, id))
      .returning();
    const updated = rows[0];
    if (!updated) {
      throw new Error(`DownloadClientRepository.update: client ${id} not found`);
    }
    return this.withDecryptedConfig(updated as DownloadClient);
  }

  async delete(id: number): Promise<DownloadClientWithDecryptedConfig> {
    const rows = await this.prisma.drizzle
      .delete(schema.downloadClients)
      .where(eq(schema.downloadClients.id, id))
      .returning();
    const deleted = rows[0];
    if (!deleted) {
      throw new Error(`DownloadClientRepository.delete: client ${id} not found`);
    }
    return this.withDecryptedConfig(deleted as DownloadClient);
  }

  async exists(id: number): Promise<boolean> {
    const rows = await this.prisma.drizzle
      .select({ id: schema.downloadClients.id })
      .from(schema.downloadClients)
      .where(eq(schema.downloadClients.id, id))
      .limit(1);
    return rows.length > 0;
  }

  async nameExists(name: string, excludeId?: number): Promise<boolean> {
    const where = excludeId !== undefined
      ? and(eq(schema.downloadClients.name, name), ne(schema.downloadClients.id, excludeId))
      : eq(schema.downloadClients.name, name);
    const rows = await this.prisma.drizzle
      .select({ id: schema.downloadClients.id })
      .from(schema.downloadClients)
      .where(where)
      .limit(1);
    return rows.length > 0;
  }
}