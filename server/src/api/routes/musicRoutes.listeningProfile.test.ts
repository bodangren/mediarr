import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';
import type { ApiDependencies } from '../types';
import { registerMusicRoutes } from './musicRoutes';

type ProfileRow = {
  id: number;
  title: string;
  artistName: string;
  playCount: number;
  lastPlayedAt: Date | null;
  isPlayed: boolean;
  position: number;
};

function createApp(rows: ProfileRow[]) {
  const drizzle = {
    select: () => ({
      from: () => ({
        innerJoin: async () => rows,
      }),
    }),
  };
  const app = Fastify();
  registerMusicRoutes(app, { prisma: { drizzle } } as unknown as ApiDependencies);
  return app;
}

describe('GET /api/music/listening-profile', () => {
  it('returns the listening profile envelope for the weekly discovery run', async () => {
    const app = createApp([
      {
        id: 1,
        title: 'Back in Black',
        artistName: 'AC/DC',
        playCount: 4,
        lastPlayedAt: new Date('2026-11-10T20:00:00Z'),
        isPlayed: true,
        position: 0,
      },
      {
        id: 2,
        title: 'Thunderstruck',
        artistName: 'AC/DC',
        playCount: 0,
        lastPlayedAt: new Date('2026-11-11T08:00:00Z'),
        isPlayed: false,
        position: 42,
      },
      { id: 3, title: 'Untouched', artistName: 'Tate McRae', playCount: 0, lastPlayedAt: null, isPlayed: false, position: 0 },
    ]);

    const response = await app.inject({ method: 'GET', url: '/api/music/listening-profile' });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.ok).toBe(true);
    expect(body.data.artists[0]).toMatchObject({ name: 'AC/DC', plays: 4, tracks: 2 });
    expect(body.data.recentlyPlayed.map((track: { title: string }) => track.title)).toEqual(['Thunderstruck', 'Back in Black']);
    expect(body.data.library.trackCount).toBe(3);
    expect(body.data.library.trackKeys).toContain('AC/DC — Back in Black');
    expect(body.data.dataQuality).toMatchObject({ playsObserved: 4, tracksPlayed: 1, insufficientHistory: true });

    await app.close();
  });

  it('returns a well-formed profile when the library is empty', async () => {
    const app = createApp([]);

    const response = await app.inject({ method: 'GET', url: '/api/music/listening-profile' });

    expect(response.statusCode).toBe(200);
    expect(response.json().data).toEqual({
      artists: [],
      tracks: [],
      recentlyPlayed: [],
      library: { trackCount: 0, artistNames: [], trackKeys: [] },
      dataQuality: { playsObserved: 0, tracksPlayed: 0, lastPlayedAt: null, insufficientHistory: true },
    });

    await app.close();
  });
});
