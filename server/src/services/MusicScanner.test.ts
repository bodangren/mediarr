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
      albumArtist: null,
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

  it('keeps album_artist separate from the track artist', () => {
    const probed = parseProbeOutput({
      format: { tags: { artist: 'Guest Singer', album_artist: 'Various Artists', title: 'Track' } },
      streams: [{ codec_type: 'video' }],
    });
    expect(probed).toMatchObject({
      artist: 'Guest Singer', albumArtist: 'Various Artists', album: null, trackNumber: null, durationSeconds: null,
    });
  });
});

describe('scanMusicLibrary staging folders', () => {
  it('never scans underscore staging/review folders', async () => {
    const root = await makeTree([
      'Artist/Album/01 - Real.mp3',
      '_incoming/music-abc123.m4a',
      '_review/music-def456.m4a',
      '_quarantine/music-ghi789.m4a',
    ]);
    const tracks: string[] = [];
    const store: MusicScanStore = {
      findArtistId: async () => 1,
      createArtist: async () => 1,
      findAlbumId: async () => 1,
      createAlbum: async () => 1,
      upsertTrack: async (input) => {
        tracks.push(input.path);
      },
    };
    const probed: ProbedTrack = {
      artist: 'Artist', albumArtist: null, album: 'Album', title: 'Real',
      trackNumber: 1, discNumber: null, durationSeconds: 100, format: 'mp3', bitrate: 320000, sizeBytes: 1000,
    };
    const summary = await scanMusicLibrary({ root, store, probe: async () => probed });
    expect(summary.tracks).toBe(1);
    expect(tracks.some(file => /\/_(incoming|review|quarantine)\//.test(file))).toBe(false);
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

  it('files a compilation as one album under the album artist', async () => {
    const root = await makeTree(['VA/Comp/01 - a.mp3', 'VA/Comp/02 - b.mp3']);
    const fake = store();
    const compilation = async (file: string): Promise<ProbedTrack> => ({
      artist: path.basename(file).startsWith('01') ? 'Alice' : 'Bob',
      albumArtist: 'Various Artists',
      album: 'Comp',
      title: path.basename(file),
      trackNumber: null, discNumber: null, durationSeconds: 100, format: 'mp3', bitrate: 320, sizeBytes: 100,
    });

    const summary = await scanMusicLibrary({ root, store: fake.store, probe: compilation });

    expect(summary).toMatchObject({ artists: 1, albums: 1, tracks: 2 });
    expect(fake.calls.filter((call) => call.startsWith('artist:'))).toEqual(['artist:Various Artists']);
  });

  it('seeded tree yields exact artist/album/track counts', async () => {
    // Deterministic tree: 3 artists, 4 albums (one artist has two), 7 tracks incl. a disc-2 set.
    const root = await makeTree([
      'Alpha/First/01 - a.mp3', 'Alpha/First/02 - b.mp3', 'Alpha/First/03 - c.mp3',
      'Alpha/Second/01 - d.mp3',
      'Beta/Only/01 - e.flac', 'Beta/Only/02 - f.flac',
      'Gamma/Set/02-02 - g.m4a',
    ]);
    const fake = store();
    const probes = probe({
      '01 - a.mp3': { artist: 'Alpha', album: 'First', trackNumber: 1 },
      '02 - b.mp3': { artist: 'Alpha', album: 'First', trackNumber: 2 },
      '03 - c.mp3': { artist: 'Alpha', album: 'First', trackNumber: 3 },
      '01 - d.mp3': { artist: 'Alpha', album: 'Second', trackNumber: 1 },
      '01 - e.flac': { artist: 'Beta', album: 'Only', trackNumber: 1 },
      '02 - f.flac': { artist: 'Beta', album: 'Only', trackNumber: 2 },
      '02-02 - g.m4a': { artist: 'Gamma', album: 'Set', trackNumber: 2, discNumber: 2 },
    });

    const summary = await scanMusicLibrary({ root, store: fake.store, probe: probes });

    expect(summary).toEqual({ scanned: 7, artists: 3, albums: 4, tracks: 7, unreadable: [] });
    expect(fake.calls.filter((call) => call.startsWith('artist:'))).toHaveLength(3);
    expect(fake.calls.filter((call) => call.startsWith('album:'))).toHaveLength(4);
    expect(fake.tracks).toHaveLength(7);
  });

  it('dry run reports the summary without writing rows', async () => {
    const root = await makeTree(['A/Album/01.mp3']);
    const fake = store();
    const summary = await scanMusicLibrary({ root, store: fake.store, probe: probe({}), dryRun: true });
    expect(summary.tracks).toBe(1);
    expect(fake.calls).toEqual([]);
  });
});
