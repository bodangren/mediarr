import type { PrismaClient, DownloadClient } from '@prisma/client';
import { encrypt, decrypt } from '../utils/encryption';

export type DownloadClientProtocol = 'torrent' | 'usenet';
export type DownloadClientType =
  | 'qbittorrent'
  | 'transmission'
  | 'deluge'
  | 'rtorrent'
  | 'utorrent'
  | 'sabnzbd'
  | 'nzbget';

export interface DownloadClientConfig {
  host: string;
  port: number;
  useSsl: boolean;
  username?: string;
  password?: string;
  apiKey?: string;
  category?: string;
  // qBittorrent specific
  sequentialDownload?: boolean;
  firstLastPiecePriority?: boolean;
  // Transmission specific
  torrentDirectory?: string;
  // Deluge specific
  label?: string;
  // rTorrent specific
  directory?: string;
  // SABnzbd specific
  tvCategory?: string;
  movieCategory?: string;
  recentTvPriority?: number;
  olderTvPriority?: number;
  recentMoviePriority?: number;
  olderMoviePriority?: number;
  // NZBGet specific
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
  constructor(private prisma: PrismaClient) {}

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

  async create(data: CreateDownloadClientInput): Promise<DownloadClientWithDecryptedConfig> {
    const created = await this.prisma.downloadClient.create({
      data: {
        name: data.name,
        protocol: data.protocol,
        type: data.type,
        enabled: data.enabled ?? true,
        priority: data.priority ?? 25,
        config: this.encryptConfig(data.config),
      },
    });

    return {
      ...created,
      config: this.decryptConfig(created.config),
    };
  }

  async findById(id: number): Promise<DownloadClientWithDecryptedConfig | null> {
    const client = await this.prisma.downloadClient.findUnique({
      where: { id },
    });

    if (!client) return null;

    return {
      ...client,
      config: this.decryptConfig(client.config),
    };
  }

  async findAll(): Promise<DownloadClientWithDecryptedConfig[]> {
    const clients = await this.prisma.downloadClient.findMany({
      orderBy: { priority: 'asc' },
    });

    return clients.map((client) => ({
      ...client,
      config: this.decryptConfig(client.config),
    }));
  }

  async findByProtocol(protocol: DownloadClientProtocol): Promise<DownloadClientWithDecryptedConfig[]> {
    const clients = await this.prisma.downloadClient.findMany({
      where: { protocol, enabled: true },
      orderBy: { priority: 'asc' },
    });

    return clients.map((client) => ({
      ...client,
      config: this.decryptConfig(client.config),
    }));
  }

  async findEnabled(): Promise<DownloadClientWithDecryptedConfig[]> {
    const clients = await this.prisma.downloadClient.findMany({
      where: { enabled: true },
      orderBy: { priority: 'asc' },
    });

    return clients.map((client) => ({
      ...client,
      config: this.decryptConfig(client.config),
    }));
  }

  async update(id: number, data: UpdateDownloadClientInput): Promise<DownloadClientWithDecryptedConfig> {
    const updateData: Record<string, unknown> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.protocol !== undefined) updateData.protocol = data.protocol;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.enabled !== undefined) updateData.enabled = data.enabled;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.config !== undefined) updateData.config = this.encryptConfig(data.config);

    const updated = await this.prisma.downloadClient.update({
      where: { id },
      data: updateData,
    });

    return {
      ...updated,
      config: this.decryptConfig(updated.config),
    };
  }

  async delete(id: number): Promise<DownloadClientWithDecryptedConfig> {
    const deleted = await this.prisma.downloadClient.delete({
      where: { id },
    });

    return {
      ...deleted,
      config: this.decryptConfig(deleted.config),
    };
  }

  async exists(id: number): Promise<boolean> {
    const count = await this.prisma.downloadClient.count({
      where: { id },
    });
    return count > 0;
  }

  async nameExists(name: string, excludeId?: number): Promise<boolean> {
    const count = await this.prisma.downloadClient.count({
      where: {
        name,
        ...(excludeId !== undefined && { NOT: { id: excludeId } }),
      },
    });
    return count > 0;
  }
}
