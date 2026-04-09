import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('Database Migration', () => {
  const deprecatedPrismaDir = path.join(__dirname, '..', 'prisma');
  const drizzleSchemaPath = path.join(__dirname, '..', 'server', 'src', 'db', 'schema.ts');
  const dbPath = path.join(__dirname, '..', 'mediarr.db');

  it('should use Drizzle schema files instead of prisma migrations', () => {
    expect(fs.existsSync(drizzleSchemaPath)).toBe(true);
    expect(fs.existsSync(deprecatedPrismaDir)).toBe(false);
  });

  it('should have a mediarr.db database file', () => {
    expect(fs.existsSync(dbPath)).toBe(true);
  });
});
