import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  isAudioFile,
  parseProbeOutput,
  scanMusicLibrary,
  type MusicScanStore,
  type ProbedTrack,
} from './MusicScanner';

const tmpDirs: string[] = [];

async function makeTree(files: string[]): Promise<string> {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'music-scan-'));
  tmpDirs.push(root);
  for (const file of files) {
    const full = path.join(root, file);
    await fsp.mkdir(path.dirname(full), { recursive: true });
    await fsp.writeFile(full, 'x');
  }
  return root;
}

afterEach(async () => {
  for (const dir of tmpDirs.splice(0)) {
    await fsp.rm(dir, { recursive: true, force: true });
  }
});

describe('isAudioFile', () => {
  it('accepts audio containers and rejects sidecars', () => {
    expect(isAudioFile('01 - Song.mp3')).toBe(true);
    expect(isAudioFile('Track FLAC.flac')).toBe(true);
    expect(isAudioFile('cover.jpg')).toBe(false);
    expect(isAudioFile('lyrics.lrc')).toBe(false);
    expect(isAudioFile('.hidden.mp3')).toBe(false);
  });
});

describe('parseProbeOutput', () => {
  it('reads uppercase Vorbis tags, fractions and stream metadata', () => {
    const probed = parseProbeOutput({
      format: {
        duration: '183.456',
        bit_rate: '320000',
        size: '4410000',
        tags: { ARTIST: 'AC/DC', ALBUM: 'Back In Black', TITLE: 'Hells Bells', track: '1/10', disc: '1/1' },
      },
      streams: [{ codec_type: 'audio', codec_name: 'mp3' }],
    });
    expect(probed).toEqual({
      artist: 'AC/DC',
      album: 'Back In Black',
      title: 'Hells Bells',
      trackNumber: 1,
      discNumber: 1,
      durationSeconds: 183,
      format: 'mp3',
      bitrate: 320000,
      sizeBytes: 4410000,
    });
  });

  it('prefers album_artist when present and tolerates missing fields', () => {
    const probed = parseProbeOutput({
      format: { tags: { album_artist: 'Various Artists', title: 'Track' } },
      streams: [{ codec_type: 'video' }],
    });
    expect(probed).toMatchObject({ artist: 'Various Artists', album: null, trackNumber: null, durationSeconds: null });
  });
});

describe('scanMusicLibrary', () => {
  function store(): { store: MusicScanStore; calls: string[]; artists: Map<string, number>; albums: Map<string, number>; tracks: string[] } {
    const calls: string[] = [];
    const artists = new Map<string, number>();
    const albums = new Map<string, number>();
    const tracks: string[] = [];
    let nextId = 1;
    return {
      calls,
      artists,
      albums,
      tracks,
      store: {
        findArtistId: async (key) => artists.get(key) ?? null,
        createArtist: async (name, key) => {
          const id = nextId++;
          artists.set(key, id);
          calls.push(`artist:${name}`);
          return id;
        },
        findAlbumId: async (artistId, titleKey) => albums.get(`${artistId}:${titleKey}`) ?? null,
        createAlbum: async (input) => {
          const id = nextId++;
          albums.set(`${input.artistId}:${input.titleKey}`, id);
          calls.push(`album:${input.title}`);
          return id;
        },
        upsertTrack: async (input) => { tracks.push(input.path); calls.push(`track:${input.title}`); },
      },
    };
  }

  const probe = (map: Record<string, Partial<ProbedTrack>>) => async (file: string): Promise<ProbedTrack> => {
    const base = path.basename(file);
    if (base.includes('broken')) throw new Error('no audio stream');
    return {
      artist: 'Artist', album: 'Album', title: base.replace(/\.[^.]+$/, ''),
      trackNumber: 1, discNumber: 1, durationSeconds: 100, format: 'mp3', bitrate: 320000, sizeBytes: 1000,
      ...(map[base] ?? {}),
    };
  };

  it('catalogues a tree, deduplicates artists/albums and is idempotent by path', async () => {
    const root = await makeTree(['A/Album/01 - One.mp3', 'A/Album/02 - Two.mp3', 'B/Other/01 - Three.flac']);
    const fake = store();

    const summary = await scanMusicLibrary({ root, store: fake.store, probe: probe({ '01 - Three.flac': { artist: 'Artist', album: 'Other Album' } }) });

    expect(summary).toMatchObject({ tracks: 3, artists: 1, albums: 2 });
    expect(fake.calls).toEqual([
      'artist:Artist', 'album:Album', 'track:01 - One', 'track:02 - Two',
      'album:Other Album', 'track:01 - Three',
    ]);
    expect(fake.tracks).toHaveLength(3);
  });

  it('reports unreadable files instead of dropping them silently', async () => {
    const root = await makeTree(['A/Album/01.mp3', 'A/Album/broken.mp3']);
    const fake = store();

    const summary = await scanMusicLibrary({ root, store: fake.store, probe: probe({}) });

    expect(summary.tracks).toBe(1);
    expect(summary.scanned).toBe(2);
    expect(summary.unreadable).toHaveLength(1);
    expect(summary.unreadable[0]?.path).toContain('broken.mp3');
  });

  it('dry run reports the summary without writing rows', async () => {
    const root = await makeTree(['A/Album/01.mp3']);
    const fake = store();
    const summary = await scanMusicLibrary({ root, store: fake.store, probe: probe({}), dryRun: true });
    expect(summary.tracks).toBe(1);
    expect(fake.calls).toEqual([]);
  });
});
