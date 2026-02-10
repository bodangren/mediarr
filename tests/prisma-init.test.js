import { describe, it, expect } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

describe('Prisma Initialization', () => {
  it('should initialize PrismaClient with better-sqlite3 adapter', async () => {
    const adapter = new PrismaBetterSqlite3({ url: 'file:prisma/dev.db' });
    const prisma = new PrismaClient({ adapter });
    expect(prisma).toBeDefined();

    // Verify connection works by making a simple query
    const result = await prisma.$queryRawUnsafe('SELECT 1 as ok');
    expect(result).toBeDefined();
    await prisma.$disconnect();
  });
});
