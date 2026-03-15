import { PrismaClient, type Notification } from '@prisma/client';
import { encrypt, decrypt } from '../utils/encryption';

// Fields that should be encrypted in config
const SENSITIVE_FIELDS: Record<string, string[]> = {
  discord: [],
  email: ['password'],
  telegram: ['botToken'],
  slack: [],
  gotify: ['appToken'],
  pushover: ['appToken', 'userKey'],
  webhook: [],
};

type NotificationConfig = Record<string, unknown>;

function encryptSensitiveFields(type: string, config: NotificationConfig): NotificationConfig {
  const sensitiveFields = SENSITIVE_FIELDS[type] || [];
  const encrypted: NotificationConfig = { ...config };

  for (const field of sensitiveFields) {
    if (typeof encrypted[field] === 'string') {
      encrypted[field] = encrypt(encrypted[field] as string);
    }
  }

  return encrypted;
}

function decryptSensitiveFields(type: string, config: NotificationConfig): NotificationConfig {
  const sensitiveFields = SENSITIVE_FIELDS[type] || [];
  const decrypted: NotificationConfig = { ...config };

  for (const field of sensitiveFields) {
    if (typeof decrypted[field] === 'string') {
      decrypted[field] = decrypt(decrypted[field] as string);
    }
  }

  return decrypted;
}

export interface CreateNotificationData {
  name: string;
  type: string;
  enabled?: boolean;
  onGrab?: boolean;
  onDownload?: boolean;
  onUpgrade?: boolean;
  onRename?: boolean;
  onSeriesAdd?: boolean;
  onEpisodeDelete?: boolean;
  config: NotificationConfig;
}

export interface UpdateNotificationData {
  name?: string;
  type?: string;
  enabled?: boolean;
  onGrab?: boolean;
  onDownload?: boolean;
  onUpgrade?: boolean;
  onRename?: boolean;
  onSeriesAdd?: boolean;
  onEpisodeDelete?: boolean;
  config?: NotificationConfig;
}

export class NotificationRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: CreateNotificationData): Promise<Notification> {
    const encryptedConfig = encryptSensitiveFields(data.type, data.config);
    return this.prisma.notification.create({
      data: {
        name: data.name,
        type: data.type,
        enabled: data.enabled ?? true,
        onGrab: data.onGrab ?? false,
        onDownload: data.onDownload ?? false,
        onUpgrade: data.onUpgrade ?? false,
        onRename: data.onRename ?? false,
        onSeriesAdd: data.onSeriesAdd ?? false,
        onEpisodeDelete: data.onEpisodeDelete ?? false,
        config: encryptedConfig as unknown as import('@prisma/client').Prisma.InputJsonValue,
      },
    });
  }

  async findById(id: number): Promise<Notification | null> {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) return null;

    return {
      ...notification,
      config: decryptSensitiveFields(notification.type, notification.config as NotificationConfig) as unknown as import('@prisma/client').Prisma.JsonValue,
    };
  }

  async findAll(): Promise<Notification[]> {
    const notifications = await this.prisma.notification.findMany();
    return notifications.map((notification) => ({
      ...notification,
      config: decryptSensitiveFields(notification.type, notification.config as NotificationConfig) as unknown as import('@prisma/client').Prisma.JsonValue,
    }));
  }

  async findAllEnabled(): Promise<Notification[]> {
    const notifications = await this.prisma.notification.findMany({
      where: { enabled: true },
    });
    return notifications.map((notification) => ({
      ...notification,
      config: decryptSensitiveFields(notification.type, notification.config as NotificationConfig) as unknown as import('@prisma/client').Prisma.JsonValue,
    }));
  }

  async update(id: number, data: UpdateNotificationData): Promise<Notification> {
    const updateData: Record<string, unknown> = { ...data };

    if (data.config && data.type) {
      updateData.config = encryptSensitiveFields(data.type, data.config);
    } else if (data.config) {
      // Need to fetch existing type to encrypt properly
      const existing = await this.prisma.notification.findUnique({ where: { id } });
      if (existing) {
        updateData.config = encryptSensitiveFields(existing.type, data.config);
      }
    }

    const updated = await this.prisma.notification.update({
      where: { id },
      data: updateData,
    });

    return {
      ...updated,
      config: decryptSensitiveFields(updated.type, updated.config as NotificationConfig) as unknown as import('@prisma/client').Prisma.JsonValue,
    };
  }

  async delete(id: number): Promise<Notification> {
    return this.prisma.notification.delete({
      where: { id },
    });
  }

  async exists(id: number): Promise<boolean> {
    const count = await this.prisma.notification.count({
      where: { id },
    });
    return count > 0;
  }

  async nameExists(name: string, excludeId?: number): Promise<boolean> {
    const count = await this.prisma.notification.count({
      where: {
        name,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    });
    return count > 0;
  }
}
