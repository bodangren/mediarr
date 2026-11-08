import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { applyTidy, isTidyCandidate, planTidy } from './StagingTidyService';

const HOUR = 60 * 60 * 1000;
const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe('staging tidy', () => {
  it('classifies only abandoned tool artefacts and old empty files', () => {
    expect(isTidyCandidate('video.mp4.part', 10, 2 * HOUR, 6 * HOUR)).toBeNull();
    expect(isTidyCandidate('video.mp4.part', 10, 7 * HOUR, 6 * HOUR)).toBe('tool-partial');
    expect(isTidyCandidate('video.mp4.ytdl', 10, 7 * HOUR, 6 * HOUR)).toBe('tool-partial');
    expect(isTidyCandidate('leftover.tmp', 10, 7 * HOUR, 6 * HOUR)).toBe('tool-partial');
    expect(isTidyCandidate('track.m4a', 0, 7 * HOUR, 6 * HOUR)).toBe('empty-file');
    expect(isTidyCandidate('track.m4a', 100, 7 * HOUR, 6 * HOUR)).toBeNull();
    expect(isTidyCandidate('video.mp4.part', 10, 1 * HOUR, 6 * HOUR)).toBeNull();
  });

  it('plans real files, skips media, and deletes the plan', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'staging-tidy-'));
    dirs.push(dir);
    const old = new Date('2026-11-09T04:30:00Z');
    const write = (name: string, content: string) => {
      const file = path.join(dir, name);
      fs.writeFileSync(file, content);
      fs.utimesSync(file, old, old);
      return file;
    };
    write('abandoned.mp4.part', 'partial');
    write('kept.m4a', 'audio');

    const candidates = await planTidy({ dirs: [dir], minAgeMs: 6 * HOUR, now: new Date('2026-11-10T04:30:00Z') });
    expect(candidates.map((candidate) => path.basename(candidate.path))).toEqual(['abandoned.mp4.part']);
    const applied = await applyTidy(candidates);
    expect(applied).toMatchObject({ deleted: 1, failed: [] });
    expect(fs.existsSync(path.join(dir, 'abandoned.mp4.part'))).toBe(false);
    expect(fs.existsSync(path.join(dir, 'kept.m4a'))).toBe(true);
  });
});
