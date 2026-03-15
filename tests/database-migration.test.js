import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('Database Migration', () => {
  const migrationDir = path.join(__dirname, '..', 'prisma', 'migrations');
  const dbPath = path.join(__dirname, '..', 'mediarr.db');

  it('should have migration files in prisma/migrations', () => {
    expect(fs.existsSync(migrationDir)).toBe(true);
  });

  it('should have a mediarr.db database file', () => {
    expect(fs.existsSync(dbPath)).toBe(true);
  });
});
