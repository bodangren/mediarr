import { and, eq, ne } from 'drizzle-orm';
import type { DatabaseClient } from '../db/drizzleClient';
import * as schema from '../db/schema';
import type { Notification } from '../types/modelTypes';
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
  constructor(private prisma: DatabaseClient) {}

  async create(data: CreateNotificationData): Promise<Notification> {
    const encryptedConfig = encryptSensitiveFields(data.type, data.config);
    const [row] = await this.prisma.drizzle
      .insert(schema.notifications)
      .values({
        name: data.name,
        type: data.type,
        enabled: data.enabled ?? true,
        onGrab: data.onGrab ?? false,
        onDownload: data.onDownload ?? false,
        onUpgrade: data.onUpgrade ?? false,
        onRename: data.onRename ?? false,
        onSeriesAdd: data.onSeriesAdd ?? false,
        onEpisodeDelete: data.onEpisodeDelete ?? false,
        config: encryptedConfig,
      })
      .returning();
    if (!row) {
      throw new Error('NotificationRepository.create: returned no row');
    }
    return row as Notification;
  }

  async findById(id: number): Promise<Notification | null> {
    const rows = await this.prisma.drizzle
      .select()
      .from(schema.notifications)
      .where(eq(schema.notifications.id, id))
      .limit(1);
    const notification = rows[0];
    if (!notification) return null;

    return {
      ...notification,
      config: decryptSensitiveFields(notification.type, notification.config as NotificationConfig),
    };
  }

  async findAll(): Promise<Notification[]> {
    const rows = await this.prisma.drizzle.select().from(schema.notifications);
    return rows.map((notification) => ({
      ...notification,
      config: decryptSensitiveFields(notification.type, notification.config as NotificationConfig),
    }));
  }

  async findAllEnabled(): Promise<Notification[]> {
    const rows = await this.prisma.drizzle
      .select()
      .from(schema.notifications)
      .where(eq(schema.notifications.enabled, true));
    return rows.map((notification) => ({
      ...notification,
      config: decryptSensitiveFields(notification.type, notification.config as NotificationConfig),
    }));
  }

  async update(id: number, data: UpdateNotificationData): Promise<Notification> {
    const updateData: Record<string, unknown> = { ...data };

    if (data.config && data.type) {
      updateData.config = encryptSensitiveFields(data.type, data.config);
    } else if (data.config) {
      const existingRows = await this.prisma.drizzle
        .select({ type: schema.notifications.type })
        .from(schema.notifications)
        .where(eq(schema.notifications.id, id))
        .limit(1);
      const existing = existingRows[0];
      if (existing) {
        updateData.config = encryptSensitiveFields(existing.type, data.config);
      }
    }

    const rows = await this.prisma.drizzle
      .update(schema.notifications)
      .set(updateData)
      .where(eq(schema.notifications.id, id))
      .returning();
    const updated = rows[0];
    if (!updated) {
      throw new Error(`NotificationRepository.update: notification ${id} not found`);
    }
    return {
      ...updated,
      config: decryptSensitiveFields(updated.type, updated.config as NotificationConfig),
    };
  }

  async delete(id: number): Promise<Notification> {
    const rows = await this.prisma.drizzle
      .delete(schema.notifications)
      .where(eq(schema.notifications.id, id))
      .returning();
    const deleted = rows[0];
    if (!deleted) {
      throw new Error(`NotificationRepository.delete: notification ${id} not found`);
    }
    return deleted as Notification;
  }

  async exists(id: number): Promise<boolean> {
    const rows = await this.prisma.drizzle
      .select({ id: schema.notifications.id })
      .from(schema.notifications)
      .where(eq(schema.notifications.id, id))
      .limit(1);
    return rows.length > 0;
  }

  async nameExists(name: string, excludeId?: number): Promise<boolean> {
    const where = excludeId
      ? and(eq(schema.notifications.name, name), ne(schema.notifications.id, excludeId))
      : eq(schema.notifications.name, name);
    const rows = await this.prisma.drizzle
      .select({ id: schema.notifications.id })
      .from(schema.notifications)
      .where(where)
      .limit(1);
    return rows.length > 0;
  }
}