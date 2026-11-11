import { describe, expect, it } from 'vitest';
import { buildListeningProfile, type ListeningTrackRow } from './musicListeningProfile';

function row(overrides: Partial<ListeningTrackRow> & Pick<ListeningTrackRow, 'id' | 'title' | 'artistName'>): ListeningTrackRow {
  return {
    playCount: 0,
    lastPlayedAt: null,
    isPlayed: false,
    position: 0,
    ...overrides,
  };
}

const at = (iso: string): Date => new Date(iso);

describe('buildListeningProfile', () => {
  it('orders artists by plays, then recency, then name; counts their tracks', () => {
    const rows: ListeningTrackRow[] = [
      row({ id: 1, title: 'A1', artistName: 'Alpha', playCount: 5, lastPlayedAt: at('2026-11-01T10:00:00Z') }),
      row({ id: 2, title: 'A2', artistName: 'Alpha', playCount: 0 }),
      row({ id: 3, title: 'B1', artistName: 'Beta', playCount: 3, lastPlayedAt: at('2026-11-02T10:00:00Z') }),
      row({ id: 4, title: 'C1', artistName: 'Gamma', playCount: 3, lastPlayedAt: at('2026-11-03T10:00:00Z') }),
      row({ id: 5, title: 'D1', artistName: 'Delta', playCount: 1, lastPlayedAt: at('2026-11-04T10:00:00Z') }),
      row({ id: 6, title: 'Z1', artistName: 'Zeta', playCount: 0 }),
    ];

    const profile = buildListeningProfile(rows);

    expect(profile.artists.map((artist) => artist.name)).toEqual(['Alpha', 'Gamma', 'Beta', 'Delta', 'Zeta']);
    expect(profile.artists[0]).toEqual({
      name: 'Alpha',
      plays: 5,
      lastPlayedAt: '2026-11-01T10:00:00.000Z',
      tracks: 2,
    });
    expect(profile.artists.at(-1)).toMatchObject({ name: 'Zeta', plays: 0, lastPlayedAt: null, tracks: 1 });
  });

  it('orders tracks by plays then recency and lists only observed tracks', () => {
    const rows: ListeningTrackRow[] = [
      row({ id: 1, title: 'Fresh', artistName: 'Alpha', playCount: 0, lastPlayedAt: at('2026-11-05T10:00:00Z') }),
      row({ id: 2, title: 'Top', artistName: 'Alpha', playCount: 4, lastPlayedAt: at('2026-11-01T10:00:00Z') }),
      row({ id: 3, title: 'Older', artistName: 'Beta', playCount: 2, lastPlayedAt: at('2026-10-01T10:00:00Z') }),
      row({ id: 4, title: 'Newer', artistName: 'Beta', playCount: 2, lastPlayedAt: at('2026-11-02T10:00:00Z') }),
      row({ id: 5, title: 'Untouched', artistName: 'Gamma', playCount: 0 }),
    ];

    const profile = buildListeningProfile(rows);

    expect(profile.tracks.map((track) => track.title)).toEqual(['Top', 'Newer', 'Older', 'Fresh']);
    expect(profile.tracks[0]).toEqual({
      id: 2,
      title: 'Top',
      artist: 'Alpha',
      playCount: 4,
      lastPlayedAt: '2026-11-01T10:00:00.000Z',
    });
  });

  it('lists recently played newest first, including a touched track with zero completed plays', () => {
    const rows: ListeningTrackRow[] = [
      row({ id: 1, title: 'Old', artistName: 'Alpha', playCount: 2, lastPlayedAt: at('2026-10-01T10:00:00Z') }),
      row({ id: 2, title: 'Touched', artistName: 'Beta', playCount: 0, lastPlayedAt: at('2026-11-06T10:00:00Z') }),
      row({ id: 3, title: 'Never', artistName: 'Gamma', playCount: 0 }),
    ];

    const profile = buildListeningProfile(rows);

    expect(profile.recentlyPlayed.map((track) => track.title)).toEqual(['Touched', 'Old']);
    expect(profile.recentlyPlayed[0]).toMatchObject({ id: 2, artist: 'Beta', playCount: 0 });
  });

  it('flags thin history honestly and clears the flag at ten observed plays', () => {
    const thin = buildListeningProfile([
      row({ id: 1, title: 'One', artistName: 'Alpha', playCount: 9, lastPlayedAt: at('2026-11-01T10:00:00Z') }),
      row({ id: 2, title: 'Never', artistName: 'Beta' }),
    ]);
    expect(thin.dataQuality).toEqual({
      playsObserved: 9,
      tracksPlayed: 1,
      lastPlayedAt: '2026-11-01T10:00:00.000Z',
      insufficientHistory: true,
    });

    const enough = buildListeningProfile([
      row({ id: 1, title: 'One', artistName: 'Alpha', playCount: 6, lastPlayedAt: at('2026-11-01T10:00:00Z') }),
      row({ id: 2, title: 'Two', artistName: 'Beta', playCount: 4, lastPlayedAt: at('2026-11-02T10:00:00Z') }),
    ]);
    expect(enough.dataQuality).toMatchObject({ playsObserved: 10, tracksPlayed: 2, insufficientHistory: false });
  });

  it('returns a well-formed empty profile for an empty library', () => {
    const profile = buildListeningProfile([]);

    expect(profile).toEqual({
      artists: [],
      tracks: [],
      recentlyPlayed: [],
      library: { trackCount: 0, artistNames: [], trackKeys: [] },
      dataQuality: { playsObserved: 0, tracksPlayed: 0, lastPlayedAt: null, insufficientHistory: true },
    });
  });

  it('builds the dedupe inventory: full track count, unique artists and "artist — title" keys', () => {
    const rows: ListeningTrackRow[] = [
      row({ id: 1, title: 'Back in Black', artistName: 'AC/DC' }),
      row({ id: 2, title: 'Back in Black', artistName: 'AC/DC' }),
      row({ id: 3, title: 'So Close to What', artistName: 'Tate McRae' }),
    ];

    const profile = buildListeningProfile(rows);

    expect(profile.library.trackCount).toBe(3);
    expect(profile.library.artistNames).toEqual(['AC/DC', 'Tate McRae']);
    expect(profile.library.trackKeys).toEqual(['AC/DC — Back in Black', 'Tate McRae — So Close to What']);
  });

  it('caps the ranking lists while leaving the library inventory complete', () => {
    const rows = Array.from({ length: 6 }, (_, index) => row({
      id: index + 1,
      title: `Track ${index + 1}`,
      artistName: `Artist ${index + 1}`,
      playCount: index + 1,
      lastPlayedAt: at(`2026-11-0${index + 1}T10:00:00Z`),
    }));

    const profile = buildListeningProfile(rows, { maxArtists: 2, maxTracks: 2, maxRecentlyPlayed: 2 });

    expect(profile.artists.map((artist) => artist.name)).toEqual(['Artist 6', 'Artist 5']);
    expect(profile.tracks.map((track) => track.title)).toEqual(['Track 6', 'Track 5']);
    expect(profile.recentlyPlayed.map((track) => track.title)).toEqual(['Track 6', 'Track 5']);
    expect(profile.library.trackCount).toBe(6);
    expect(profile.library.trackKeys).toHaveLength(6);
  });
});
