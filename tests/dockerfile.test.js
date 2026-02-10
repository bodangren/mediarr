import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('Dockerfile', () => {
  const dockerfilePath = path.join(__dirname, '..', 'Dockerfile');

  it('should exist', () => {
    expect(fs.existsSync(dockerfilePath)).toBe(true);
  });

  it('should contain all required keywords', () => {
    const content = fs.readFileSync(dockerfilePath, 'utf8');
    const requiredKeywords = ['FROM', 'RUN', 'COPY', 'EXPOSE', 'CMD'];

    for (const keyword of requiredKeywords) {
      expect(content, `Dockerfile missing keyword: ${keyword}`).toContain(keyword);
    }
  });
});
