import { describe, expect, it } from 'vitest';
import {
  albumTitleKey,
  nameKey,
  resolveAlbum,
  resolveArtist,
  resolveTitle,
  summarizeScan,
  trackOrderKey,
  type ScannedTrack,
} from './MusicLibrary';

const track = (overrides: Partial<ScannedTrack> = {}): ScannedTrack => ({
  path: '/data/Music/Artist/Album/01 - Song.mp3',
  artist: 'Artist',
  album: 'Album',
  title: 'Song',
  trackNumber: 1,
  discNumber: 1,
  durationSeconds: 180,
  format: 'mp3',
  bitrate: 320,
  sizeBytes: 1024,
  ...overrides,
});

describe('music name identity', () => {
  it('casefolds and collapses whitespace so tag noise cannot duplicate rows', () => {
    expect(nameKey('  AC/DC  ')).toBe('ac/dc');
    expect(nameKey('Tate  McRae')).toBe('tate mcrae');
    expect(nameKey('Tate McRae')).toBe(nameKey('tate mcrae'));
  });

  it('normalises typographic apostrophes in album titles', () => {
    expect(albumTitleKey("Don\u2019t Smile")).toBe(albumTitleKey("Don't Smile"));
  });
});

describe('unknown buckets', () => {
  it('resolves missing tags to explicit buckets instead of nulls', () => {
    expect(resolveArtist(null)).toBe('Unknown Artist');
    expect(resolveArtist('   ')).toBe('Unknown Artist');
    expect(resolveAlbum(undefined)).toBe('Unknown Album');
    expect(resolveTitle(null, '/data/Music/x/05 - Some Song.mp3')).toBe('05 - Some Song');
  });
});

describe('trackOrderKey', () => {
  it('orders disc then track and puts untagged tracks last', () => {
    expect(trackOrderKey({ discNumber: 1, trackNumber: 2 })).toEqual([1, 2]);
    expect(trackOrderKey({ discNumber: 2, trackNumber: 1 })).toEqual([2, 1]);
    expect(trackOrderKey({ discNumber: null, trackNumber: null })).toEqual([0, 9999]);
  });
});

describe('summarizeScan', () => {
  it('counts distinct artists and albums and reports unreadable files', () => {
    const summary = summarizeScan([
      track(),
      track({ path: '/data/Music/Artist/Album/02 - Song.mp3', trackNumber: 2 }),
      track({ path: '/data/Music/Other/Record/01.mp3', artist: 'Other', album: 'Record' }),
      track({ path: '/data/Music/Other/Record/02.mp3', artist: 'other ', album: 'record' }),
    ], [{ path: '/data/Music/broken.mp3', error: 'no audio stream' }]);

    expect(summary).toMatchObject({ scanned: 5, artists: 2, albums: 2, tracks: 4 });
    expect(summary.unreadable).toEqual([{ path: '/data/Music/broken.mp3', error: 'no audio stream' }]);
  });

  it('catalogues untagged files rather than dropping them', () => {
    const summary = summarizeScan([track({ artist: null, album: null, title: null })]);
    expect(summary).toMatchObject({ artists: 1, albums: 1, tracks: 1 });
  });
});
