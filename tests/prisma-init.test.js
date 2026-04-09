import { describe, it, expect } from 'vitest';
import { createTestPrismaClient } from './helpers/test-prisma-client';

describe('Prisma Initialization', () => {
  it('should initialize PrismaClient compatibility runtime on Drizzle', async () => {
    const prisma = createTestPrismaClient();
    expect(prisma).toBeDefined();

    // Verify connection works by making a simple query
    const result = await prisma.$queryRawUnsafe('SELECT 1 as ok');
    expect(result).toBeDefined();
    await prisma.$disconnect();
  });
});
