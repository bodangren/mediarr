import { describe, expect, it, vi } from 'vitest';
import { MusicTaggerService, targetRelativePath } from './MusicTaggerService';
import type { ProbedTrack } from './MusicScanner';

const probed = (overrides: Partial<ProbedTrack> = {}): ProbedTrack => ({
  artist: 'Rick Astley', album: 'Whenever You Need Somebody', title: 'Never Gonna Give You Up',
  trackNumber: 1, discNumber: 1, durationSeconds: 213, format: 'aac', bitrate: 256000, sizeBytes: 1000,
  ...overrides,
});

function io() {
  const renames: Array<[string, string]> = [];
  return {
    renames,
    io: {
      mkdir: vi.fn(async () => undefined),
      rename: vi.fn(async (from: string, to: string) => { renames.push([from, to]); }),
      stat: vi.fn(async () => ({ size: 1 })),
    },
  };
}

describe('targetRelativePath', () => {
  it('builds artist/album/NN - title and strips unsafe characters', () => {
    expect(targetRelativePath({ artist: 'AC/DC', album: 'Back: In Black', title: 'Hells/Bells', trackNumber: 3 }, '.m4a'))
      .toBe('AC DC/Back In Black/03 - Hells Bells.m4a');
  });

  it('uses 00 when the track number is unknown', () => {
    expect(targetRelativePath({ artist: 'A', album: 'B', title: 'C', trackNumber: null }, '.m4a'))
      .toBe('A/B/00 - C.m4a');
  });
});

describe('MusicTaggerService', () => {
  it('tags in place and files the track into the library tree', async () => {
    const { io: fake, renames } = io();
    const beet = vi.fn(async (args: string[]) => {
      expect(args.slice(0, 5)).toEqual(['import', '-q', '-M', '-C', '-w']);
    });
    const service = new MusicTaggerService({
      musicRoot: '/data/Music', reviewDir: '/data/Music/_review',
      runBeet: beet, probe: async () => probed(), fsOps: fake,
    });

    const result = await service.tagAndFile('/data/Music/_incoming/music-x.m4a');

    expect(result).toMatchObject({ ok: true, filed: true });
    expect(result.finalPath).toBe('/data/Music/Rick Astley/Whenever You Need Somebody/01 - Never Gonna Give You Up.m4a');
    expect(renames).toHaveLength(1);
  });

  it('routes unidentified audio to review with an explicit reason', async () => {
    const { io: fake, renames } = io();
    const service = new MusicTaggerService({
      musicRoot: '/data/Music', reviewDir: '/data/Music/_review',
      runBeet: async () => undefined,
      probe: async () => probed({ artist: 'Unknown Artist', album: 'Unknown Album' }),
      fsOps: fake,
    });

    const result = await service.tagAndFile('/data/Music/_incoming/music-x.m4a');

    expect(result).toMatchObject({ ok: true, filed: false });
    expect(result.reason).toContain('untaggable: missing artist, album');
    expect(result.finalPath).toBe('/data/Music/_review/music-x.m4a');
    expect(renames[0]?.[1]).toContain('/_review/');
  });

  it('reports a beets failure without moving the file', async () => {
    const { io: fake, renames } = io();
    const service = new MusicTaggerService({
      musicRoot: '/data/Music', reviewDir: '/data/Music/_review',
      runBeet: async () => { throw new Error('MusicBrainz unreachable'); },
      probe: async () => probed(),
      fsOps: fake,
    });

    const result = await service.tagAndFile('/data/Music/_incoming/music-x.m4a');

    expect(result.ok).toBe(false);
    expect(result.error).toContain('MusicBrainz unreachable');
    expect(renames).toHaveLength(0);
  });
});
