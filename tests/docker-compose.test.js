import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('docker-compose.yml', () => {
  const filePath = path.join(__dirname, '..', 'docker-compose.yml');

  it('should exist', () => {
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it('should contain required sections', () => {
    const content = fs.readFileSync(filePath, 'utf8');
    expect(content).toContain('services:');
    expect(content).toContain('mediarr:');
  });
});
