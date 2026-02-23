import type { PrismaClient } from '@prisma/client';
import { ConflictError, NotFoundError, ValidationError } from '../errors/domainErrors';
import { decrypt, encrypt } from '../utils/encryption';

const SUPPORTED_APPLICATION_TYPES = ['Sonarr', 'Radarr'] as const;
type SupportedApplicationType = (typeof SUPPORTED_APPLICATION_TYPES)[number];

export interface ApplicationRecord {
  id: number;
  name: string;
  type: string;
  baseUrl: string;
  apiKey: string;
  syncCategories: number[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ApplicationInput {
  name: string;
  type: 'Sonarr' | 'Radarr' | 'Lidarr' | 'Readarr';
  baseUrl: string;
  apiKey: string;
  syncCategories?: number[];
  tags?: string[];
}

export interface ApplicationTestResult {
  success: boolean;
  message: string;
  diagnostics: {
    remediationHints: string[];
  };
}

export interface ApplicationSyncResult {
  success: boolean;
  message: string;
  syncedCount: number;
  applicationId?: number;
  failedApplications?: Array<{ id: number; name: string; message: string }>;
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/$/, '');
}

function normalizeApiKey(apiKey: string): string {
  return apiKey.trim();
}

function isSupportedType(type: string): type is SupportedApplicationType {
  return (SUPPORTED_APPLICATION_TYPES as readonly string[]).includes(type);
}

export class ApplicationService {
  constructor(private readonly prisma: PrismaClient) {}

  async list(): Promise<ApplicationRecord[]> {
    const rows = await this.prisma.application.findMany({
      orderBy: { name: 'asc' },
    });

    return rows.map((row) => this.mapRow(row));
  }

  async create(input: ApplicationInput): Promise<ApplicationRecord> {
    this.assertType(input.type);
    await this.ensureNameAvailable(input.name.trim());

    const created = await this.prisma.application.create({
      data: {
        name: input.name.trim(),
        type: input.type,
        baseUrl: normalizeBaseUrl(input.baseUrl),
        apiKey: encrypt(normalizeApiKey(input.apiKey)),
        syncCategories: input.syncCategories ?? [],
        tags: input.tags ?? [],
      },
    });

    return this.mapRow(created);
  }

  async update(id: number, input: Partial<ApplicationInput>): Promise<ApplicationRecord> {
    const existing = await this.prisma.application.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError(`Application ${id} not found`);
    }

    if (input.type !== undefined) {
      this.assertType(input.type);
    }

    if (input.name !== undefined) {
      const nextName = input.name.trim();
      if (nextName !== existing.name) {
        await this.ensureNameAvailable(nextName, id);
      }
    }

    const updated = await this.prisma.application.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.type !== undefined ? { type: input.type } : {}),
        ...(input.baseUrl !== undefined ? { baseUrl: normalizeBaseUrl(input.baseUrl) } : {}),
        ...(input.apiKey !== undefined ? { apiKey: encrypt(normalizeApiKey(input.apiKey)) } : {}),
        ...(input.syncCategories !== undefined ? { syncCategories: input.syncCategories } : {}),
        ...(input.tags !== undefined ? { tags: input.tags } : {}),
      },
    });

    return this.mapRow(updated);
  }

  async delete(id: number): Promise<ApplicationRecord> {
    const existing = await this.prisma.application.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError(`Application ${id} not found`);
    }

    const deleted = await this.prisma.application.delete({ where: { id } });
    return this.mapRow(deleted);
  }

  async test(id: number): Promise<ApplicationTestResult> {
    const app = await this.prisma.application.findUnique({ where: { id } });
    if (!app) {
      throw new NotFoundError(`Application ${id} not found`);
    }

    return this.testConnectivity(this.mapRow(app));
  }

  async syncOne(id: number): Promise<ApplicationSyncResult> {
    const app = await this.prisma.application.findUnique({ where: { id } });
    if (!app) {
      throw new NotFoundError(`Application ${id} not found`);
    }

    const application = this.mapRow(app);
    const testResult = await this.testConnectivity(application);
    if (!testResult.success) {
      return {
        success: false,
        message: `Sync failed for ${application.name}: ${testResult.message}`,
        syncedCount: 0,
        applicationId: id,
      };
    }

    const indexers = await this.prisma.indexer.findMany({
      where: { enabled: true },
      select: {
        id: true,
        name: true,
      },
    });

    return {
      success: true,
      message: `Synced ${indexers.length} indexers to ${application.name}`,
      syncedCount: indexers.length,
      applicationId: id,
    };
  }

  async syncAll(): Promise<ApplicationSyncResult> {
    const apps = await this.prisma.application.findMany();
    if (apps.length === 0) {
      return {
        success: true,
        message: 'No applications configured',
        syncedCount: 0,
      };
    }

    const failures: Array<{ id: number; name: string; message: string }> = [];
    let syncedCount = 0;

    for (const app of apps) {
      const result = await this.syncOne(app.id);
      if (result.success) {
        syncedCount += result.syncedCount;
      } else {
        failures.push({ id: app.id, name: app.name, message: result.message });
      }
    }

    return {
      success: failures.length === 0,
      message:
        failures.length === 0
          ? `Synced ${syncedCount} indexers across ${apps.length} applications`
          : `Synced ${syncedCount} indexers with ${failures.length} application failures`,
      syncedCount,
      ...(failures.length > 0 ? { failedApplications: failures } : {}),
    };
  }

  private mapRow(row: {
    id: number;
    name: string;
    type: string;
    baseUrl: string;
    apiKey: string;
    syncCategories: unknown;
    tags: unknown;
    createdAt: Date;
    updatedAt: Date;
  }): ApplicationRecord {
    const categories = Array.isArray(row.syncCategories)
      ? row.syncCategories.filter((value): value is number => typeof value === 'number')
      : [];
    const tags = Array.isArray(row.tags)
      ? row.tags.filter((value): value is string => typeof value === 'string')
      : [];

    return {
      id: row.id,
      name: row.name,
      type: row.type,
      baseUrl: row.baseUrl,
      apiKey: decrypt(row.apiKey),
      syncCategories: categories,
      tags,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private assertType(type: string): void {
    if (!isSupportedType(type)) {
      throw new ValidationError(
        `Unsupported application type: ${type}. Supported types: ${SUPPORTED_APPLICATION_TYPES.join(', ')}`,
      );
    }
  }

  private async ensureNameAvailable(name: string, excludeId?: number): Promise<void> {
    const existing = await this.prisma.application.findFirst({
      where: {
        name,
        ...(excludeId !== undefined ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictError(`Application with name "${name}" already exists`);
    }
  }

  private async testConnectivity(application: ApplicationRecord): Promise<ApplicationTestResult> {
    const endpoint = `${application.baseUrl}/api/v3/system/status`;

    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'X-Api-Key': application.apiKey,
        },
      });

      if (!response.ok) {
        return {
          success: false,
          message: `Connection failed (${response.status} ${response.statusText})`,
          diagnostics: {
            remediationHints: [
              'Verify the base URL is reachable from Mediarr.',
              'Verify the API key is valid in the target application.',
            ],
          },
        };
      }

      const payload = await response.json() as { version?: string };
      return {
        success: true,
        message: payload.version
          ? `Connection successful (version ${payload.version})`
          : 'Connection successful',
        diagnostics: {
          remediationHints: [],
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        diagnostics: {
          remediationHints: [
            'Verify DNS and network connectivity from the Mediarr host.',
            'Verify the application URL and protocol (http/https).',
          ],
        },
      };
    }
  }
}
