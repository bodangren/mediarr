import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { audioHashOf, decideIngest } from './MusicIngestLedger';

describe('decideIngest', () => {
  const existing = [
    { videoId: 'aaaaaaaaaaa', audioHash: 'hash-a', status: 'FILED' },
    { videoId: 'bbbbbbbbbbb', audioHash: 'hash-b', status: 'REVIEW' },
  ];

  it('rejects the same video id before it is downloaded again', () => {
    expect(decideIngest('aaaaaaaaaaa', null, existing)).toEqual({
      duplicate: true, reason: 'video', existingVideoId: 'aaaaaaaaaaa',
    });
  });

  it('rejects the same audio under a different video', () => {
    expect(decideIngest('ccccccccccc', 'hash-b', existing)).toEqual({
      duplicate: true, reason: 'audio', existingVideoId: 'bbbbbbbbbbb',
    });
  });

  it('accepts a new video with new audio', () => {
    expect(decideIngest('ddddddddddd', 'hash-d', existing)).toEqual({ duplicate: false });
  });

  it('accepts when no hash is known yet, as long as the video is new', () => {
    expect(decideIngest('eeeeeeeeeee', null, existing)).toEqual({ duplicate: false });
  });
});

describe('audioHashOf', () => {
  it('is stable for identical content and differs for different content', async () => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'music-hash-'));
    try {
      const a = path.join(dir, 'a.m4a');
      const b = path.join(dir, 'b.m4a');
      const c = path.join(dir, 'c.m4a');
      await fsp.writeFile(a, 'same bytes');
      await fsp.writeFile(b, 'same bytes');
      await fsp.writeFile(c, 'other bytes');
      expect(await audioHashOf(a)).toBe(await audioHashOf(b));
      expect(await audioHashOf(a)).not.toBe(await audioHashOf(c));
    } finally {
      await fsp.rm(dir, { recursive: true, force: true });
    }
  });
});
