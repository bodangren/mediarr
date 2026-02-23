import type { PrismaClient } from '@prisma/client';
import { ConflictError, NotFoundError } from '../errors/domainErrors';

export interface AppProfileRecord {
  id: number;
  name: string;
  enableRss: boolean;
  enableInteractiveSearch: boolean;
  enableAutomaticSearch: boolean;
  minimumSeeders: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AppProfileInput {
  name: string;
  enableRss?: boolean;
  enableInteractiveSearch?: boolean;
  enableAutomaticSearch?: boolean;
  minimumSeeders?: number;
}

function normalizeName(name: string): string {
  return name.trim();
}

export class AppProfileService {
  constructor(private readonly prisma: PrismaClient) {}

  async list(): Promise<AppProfileRecord[]> {
    return this.prisma.appProfile.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async create(input: AppProfileInput): Promise<AppProfileRecord> {
    const name = normalizeName(input.name);
    await this.ensureNameAvailable(name);

    return this.prisma.appProfile.create({
      data: {
        name,
        enableRss: input.enableRss ?? true,
        enableInteractiveSearch: input.enableInteractiveSearch ?? true,
        enableAutomaticSearch: input.enableAutomaticSearch ?? true,
        minimumSeeders: input.minimumSeeders ?? 0,
      },
    });
  }

  async update(id: number, input: Partial<AppProfileInput>): Promise<AppProfileRecord> {
    const existing = await this.prisma.appProfile.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError(`App profile ${id} not found`);
    }

    const nextName = input.name ? normalizeName(input.name) : existing.name;
    if (nextName !== existing.name) {
      await this.ensureNameAvailable(nextName, id);
    }

    return this.prisma.appProfile.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: nextName } : {}),
        ...(input.enableRss !== undefined ? { enableRss: input.enableRss } : {}),
        ...(input.enableInteractiveSearch !== undefined
          ? { enableInteractiveSearch: input.enableInteractiveSearch }
          : {}),
        ...(input.enableAutomaticSearch !== undefined
          ? { enableAutomaticSearch: input.enableAutomaticSearch }
          : {}),
        ...(input.minimumSeeders !== undefined ? { minimumSeeders: input.minimumSeeders } : {}),
      },
    });
  }

  async delete(id: number): Promise<AppProfileRecord> {
    const existing = await this.prisma.appProfile.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError(`App profile ${id} not found`);
    }

    return this.prisma.appProfile.delete({ where: { id } });
  }

  async clone(id: number): Promise<AppProfileRecord> {
    const source = await this.prisma.appProfile.findUnique({ where: { id } });
    if (!source) {
      throw new NotFoundError(`App profile ${id} not found`);
    }

    const baseName = `${source.name} (Copy)`;
    const name = await this.nextCloneName(baseName);

    return this.prisma.appProfile.create({
      data: {
        name,
        enableRss: source.enableRss,
        enableInteractiveSearch: source.enableInteractiveSearch,
        enableAutomaticSearch: source.enableAutomaticSearch,
        minimumSeeders: source.minimumSeeders,
      },
    });
  }

  private async ensureNameAvailable(name: string, excludeId?: number): Promise<void> {
    const existing = await this.prisma.appProfile.findFirst({
      where: {
        name,
        ...(excludeId !== undefined ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictError(`App profile with name "${name}" already exists`);
    }
  }

  private async nextCloneName(baseName: string): Promise<string> {
    const existing = await this.prisma.appProfile.findMany({
      where: {
        name: {
          startsWith: baseName,
        },
      },
      select: { name: true },
    });

    const taken = new Set(existing.map((item) => item.name));
    if (!taken.has(baseName)) {
      return baseName;
    }

    let attempt = 2;
    while (taken.has(`${baseName} ${attempt}`)) {
      attempt += 1;
    }

    return `${baseName} ${attempt}`;
  }
}
