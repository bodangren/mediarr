import { describe, it, expect } from 'vitest';
import { createTestPrismaClient } from './helpers/test-prisma-client';

describe('Prisma Initialization', () => {
  it('should initialize PrismaClient compatibility runtime on Drizzle', async () => {
    const prisma = createTestPrismaClient();
    expect(prisma).toBeDefined();

    // Verify connection works by making a simple query
    const result = prisma.sqlite.prepare('SELECT 1 as ok').all();
    expect(result).toBeDefined();
    await prisma.$disconnect();
  });
});
