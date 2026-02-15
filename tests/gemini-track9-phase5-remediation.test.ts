import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { resolveTrack9ArtifactPath } from './helpers/track9Paths';

const BACKLOG_PATH = resolveTrack9ArtifactPath('gemini-remediation-backlog.json');

describe('Track 9 Phase 5 Remediation Backlog Schema (Gemini)', () => {
  it('validates backlog schema', () => {
    expect(fs.existsSync(BACKLOG_PATH)).toBe(true);
    const content = fs.readFileSync(BACKLOG_PATH, 'utf8');
    const backlog = JSON.parse(content);

    expect(Array.isArray(backlog.items)).toBe(true);
    
    for (const item of backlog.items) {
      expect(item.id).toBeTypeOf('string');
      expect(item.title).toBeTypeOf('string');
      expect(item.severity).toMatch(/P[0-3]/);
      expect(item.status).toMatch(/open|planned/);
      expect(item.ownerTrack).toBeTypeOf('string');
    }
  });
});
