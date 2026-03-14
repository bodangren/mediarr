import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSQLite3 } from '@prisma/adapter-better-sqlite3';
import { seedCategories, STANDARD_CATEGORIES } from '../server/src/seeds/categories';

const adapter = new PrismaBetterSQLite3({ url: 'file:prisma/dev.db' });
const prisma = new PrismaClient({ adapter });

describe('Category Seed', () => {
  beforeAll(async () => {
    await prisma.category.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should export standard Newznab categories with correct structure', () => {
    expect(STANDARD_CATEGORIES).toBeDefined();
    expect(Array.isArray(STANDARD_CATEGORIES)).toBe(true);

    // Verify parent categories exist
    const parentIds = STANDARD_CATEGORIES.filter(c => c.parent_id === null).map(c => c.id);
    expect(parentIds).toContain(1000); // Console
    expect(parentIds).toContain(2000); // Movies
    expect(parentIds).toContain(3000); // Audio
    expect(parentIds).toContain(4000); // PC
    expect(parentIds).toContain(5000); // TV
    expect(parentIds).toContain(7000); // Books
  });

  it('should have subcategories referencing valid parents', () => {
    const parentIds = new Set(
      STANDARD_CATEGORIES.filter(c => c.parent_id === null).map(c => c.id)
    );

    const subcategories = STANDARD_CATEGORIES.filter(c => c.parent_id !== null);
    for (const sub of subcategories) {
      expect(parentIds.has(sub.parent_id), `Subcategory ${sub.id} (${sub.name}) has invalid parent_id ${sub.parent_id}`).toBe(true);
    }
  });

  it('should have Movies subcategories (SD, HD, UHD, etc.)', () => {
    const movieSubs = STANDARD_CATEGORIES.filter(c => c.parent_id === 2000);
    expect(movieSubs.length).toBeGreaterThanOrEqual(5);

    const movieSubNames = movieSubs.map(c => c.name);
    expect(movieSubNames).toContain('Movies/SD');
    expect(movieSubNames).toContain('Movies/HD');
    expect(movieSubNames).toContain('Movies/UHD');
  });

  it('should have TV subcategories (SD, HD, UHD, Anime, etc.)', () => {
    const tvSubs = STANDARD_CATEGORIES.filter(c => c.parent_id === 5000);
    expect(tvSubs.length).toBeGreaterThanOrEqual(5);

    const tvSubNames = tvSubs.map(c => c.name);
    expect(tvSubNames).toContain('TV/SD');
    expect(tvSubNames).toContain('TV/HD');
    expect(tvSubNames).toContain('TV/Anime');
  });

  it('should seed categories into the database', async () => {
    const count = await seedCategories(prisma);

    expect(count).toBe(STANDARD_CATEGORIES.length);

    const dbCategories = await prisma.category.findMany();
    expect(dbCategories.length).toBe(STANDARD_CATEGORIES.length);
  });

  it('should be idempotent (re-seeding does not duplicate)', async () => {
    // Seed again
    const count = await seedCategories(prisma);
    expect(count).toBe(STANDARD_CATEGORIES.length);

    const dbCategories = await prisma.category.findMany();
    expect(dbCategories.length).toBe(STANDARD_CATEGORIES.length);
  });

  it('should store correct parent-child relationships in the database', async () => {
    const movies = await prisma.category.findUnique({ where: { id: 2000 } });
    expect(movies).not.toBeNull();
    expect(movies.name).toBe('Movies');
    expect(movies.parent_id).toBeNull();

    const moviesHD = await prisma.category.findUnique({ where: { id: 2040 } });
    expect(moviesHD).not.toBeNull();
    expect(moviesHD.name).toBe('Movies/HD');
    expect(moviesHD.parent_id).toBe(2000);
  });
});
