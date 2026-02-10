import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');

describe('Indexer Schema', () => {
  it('should have Indexer model with expected fields', () => {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    expect(schema).toContain('model Indexer');
    expect(schema).toContain('id');
    expect(schema).toContain('name');
    expect(schema).toContain('implementation');
    expect(schema).toContain('settings');
    expect(schema).toContain('protocol');
  });

  it('should have IndexerRelease model with expected fields', () => {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    expect(schema).toContain('model IndexerRelease');
    expect(schema).toContain('guid');
    expect(schema).toContain('title');
    expect(schema).toContain('size');
    expect(schema).toContain('indexerId');
  });

  it('should have Category model with expected fields', () => {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    expect(schema).toContain('model Category');
    expect(schema).toContain('id');
    expect(schema).toContain('name');
  });
});
