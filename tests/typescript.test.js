import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('TypeScript Configuration', () => {
  const requiredFiles = [
    'tsconfig.json',
    'app/tsconfig.json',
    'server/tsconfig.json',
  ];

  it.each(requiredFiles)('should have %s', (file) => {
    const filePath = path.join(__dirname, '..', file);
    expect(fs.existsSync(filePath), `Missing ${file}`).toBe(true);
  });
});
