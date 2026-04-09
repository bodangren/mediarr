import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('Schema contract', () => {
  it('should remove legacy Prisma schema and keep Drizzle schema', () => {
    const prismaSchemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
    const drizzleSchemaPath = path.join(__dirname, '..', 'server', 'src', 'db', 'schema.ts');
    expect(fs.existsSync(prismaSchemaPath)).toBe(false);
    expect(fs.existsSync(drizzleSchemaPath)).toBe(true);
  });
});
