import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { encodeJellyfinId } from '../jellyfin/ids';
import { createJellyfinServer } from './createJellyfinServer';

type ReferenceMethod = 'GET' | 'POST' | 'DELETE' | 'WEBSOCKET';

interface ReferenceEndpoint {
  method: ReferenceMethod;
  path: string;
  status: number;
}

const KNOWN_GOOD_ENDPOINTS: readonly ReferenceEndpoint[] = [
  { method: 'GET', path: '/System/Info/Public', status: 200 },
  { method: 'GET', path: '/System/Info', status: 200 },
  { method: 'GET', path: '/System/Ping', status: 200 },
  { method: 'POST', path: '/System/Ping', status: 200 },
  { method: 'GET', path: '/System/Configuration', status: 200 },
  { method: 'GET', path: '/Users/Public', status: 200 },
  { method: 'GET', path: '/Users', status: 200 },
  { method: 'GET', path: '/Users/{uid}', status: 200 },
  { method: 'POST', path: '/Users/AuthenticateByName', status: 200 },
  { method: 'GET', path: '/Users/{uid}/Views', status: 200 },
  { method: 'GET', path: '/UserViews', status: 200 },
  { method: 'GET', path: '/Users/{uid}/GroupingOptions', status: 200 },
  { method: 'GET', path: '/Library/MediaFolders', status: 200 },
  { method: 'GET', path: '/Library/VirtualFolders', status: 200 },
  { method: 'POST', path: '/Library/Refresh', status: 200 },
  { method: 'GET', path: '/Users/{uid}/Items/Resume', status: 200 },
  { method: 'GET', path: '/UserItems/Resume', status: 200 },
  { method: 'POST', path: '/UserPlayedItems/{item_id}', status: 200 },
  { method: 'DELETE', path: '/UserPlayedItems/{item_id}', status: 200 },
  { method: 'GET', path: '/Users/{uid}/Items/Latest', status: 200 },
  { method: 'GET', path: '/Items/Latest', status: 200 },
  { method: 'GET', path: '/Users/{uid}/Items/{item_id}', status: 200 },
  { method: 'GET', path: '/Users/{uid}/Items', status: 200 },
  { method: 'GET', path: '/Items', status: 200 },
  { method: 'GET', path: '/Items/{item_id}', status: 200 },
  { method: 'GET', path: '/Items/{item_id}/SpecialFeatures', status: 200 },
  { method: 'GET', path: '/Items/{item_id}/PlaybackInfo', status: 200 },
  { method: 'POST', path: '/Items/{item_id}/PlaybackInfo', status: 200 },
  { method: 'GET', path: '/Items/{item_id}/Images/{image_type}', status: 404 },
  { method: 'GET', path: '/Items/{item_id}/Images/{image_type}/{index}', status: 404 },
  { method: 'GET', path: '/Shows/NextUp', status: 200 },
  { method: 'GET', path: '/Shows/{series_id}/Seasons', status: 200 },
  { method: 'GET', path: '/Shows/{series_id}/Episodes', status: 200 },
  { method: 'GET', path: '/Videos/{item_id}/stream', status: 200 },
  { method: 'GET', path: '/Videos/{item_id}/stream.{container}', status: 200 },
  { method: 'GET', path: '/Audio/{item_id}/stream', status: 200 },
  { method: 'GET', path: '/Audio/{item_id}/stream.{container}', status: 200 },
  { method: 'GET', path: '/Items/{item_id}/Download', status: 200 },
  { method: 'WEBSOCKET', path: '/socket', status: 101 },
  { method: 'POST', path: '/Sessions/Capabilities', status: 204 },
  { method: 'POST', path: '/Sessions/Capabilities/Full', status: 204 },
  { method: 'POST', path: '/Sessions/Playing', status: 204 },
  { method: 'POST', path: '/Sessions/Playing/Progress', status: 204 },
  { method: 'POST', path: '/Sessions/Playing/Stopped', status: 204 },
  { method: 'GET', path: '/Sessions', status: 200 },
  { method: 'GET', path: '/DisplayPreferences/{preset_id}', status: 200 },
  { method: 'POST', path: '/DisplayPreferences/{preset_id}', status: 204 },
  { method: 'POST', path: '/ClientLog/Document', status: 204 },
  { method: 'GET', path: '/Branding/Configuration', status: 200 },
  { method: 'GET', path: '/', status: 200 },
  { method: 'GET', path: '/web', status: 200 },
  { method: 'GET', path: '/web/', status: 200 },
];

const movieId = encodeJellyfinId('movie', 8);
const seriesId = encodeJellyfinId('series', 7);
const episodeId = encodeJellyfinId('episode', 42);
let mediaDirectory = '';
let mediaPath = '';

function declarationKey(method: ReferenceMethod, routePath: string): string {
  return `${method} ${routePath.replace(/(?::[A-Za-z_]\w*|\{[A-Za-z_]\w*\})/g, '{}')}`;
}

function parsePythonDeclarations(source: string): string[] {
  return [...source.matchAll(/^@app\.(get|post|delete|websocket)\("([^"]+)"/gm)]
    .map(([, method = '', routePath = '']) => declarationKey(
      method.toUpperCase() as ReferenceMethod,
      routePath,
    ))
    .sort();
}

function parseFastifyDeclarations(source: string): string[] {
  return [...source.matchAll(/\b(?:app|socketRoutes)\.(get|post|delete)\(\s*(['"])([^'"]+)\2/g)]
    .map((match) => {
      const method = (match[1] ?? '').toUpperCase() as ReferenceMethod;
      const routePath = match[3] ?? '';
      const normalizedMethod = routePath === '/socket' ? 'WEBSOCKET' : method;
      return declarationKey(normalizedMethod, routePath);
    })
    .sort();
}

function requestPath(referencePath: string): string {
  return referencePath
    .replaceAll('{uid}', 'Me')
    .replaceAll('{item_id}', episodeId)
    .replaceAll('{series_id}', seriesId)
    .replaceAll('{image_type}', 'Primary')
    .replaceAll('{index}', '0')
    .replaceAll('{container}', 'mp4')
    .replaceAll('{preset_id}', 'tv-home');
}

function requestPayload(endpoint: ReferenceEndpoint): Record<string, unknown> | string | undefined {
  if (endpoint.path === '/Users/AuthenticateByName') return { Username: 'Mediarr', Pw: '' };
  if (endpoint.path === '/Sessions/Playing') {
    return { DeviceId: 'tv-1', ItemId: episodeId, PositionTicks: 10_000_000 };
  }
  if (endpoint.path === '/Sessions/Playing/Progress') {
    return {
      DeviceId: 'tv-1',
      ItemId: episodeId,
      PositionTicks: 20_000_000,
      RunTimeTicks: 100_000_000,
    };
  }
  if (endpoint.path === '/Sessions/Playing/Stopped') {
    return {
      DeviceId: 'tv-1',
      ItemId: episodeId,
      PositionTicks: 20_000_000,
      RunTimeTicks: 100_000_000,
    };
  }
  if (endpoint.path === '/DisplayPreferences/{preset_id}') return { SortOrder: 'Ascending' };
  if (endpoint.path === '/ClientLog/Document') return 'client diagnostic';
  return undefined;
}

function createPrismaFixture() {
  const movie = {
    id: 8,
    tmdbId: 80,
    title: 'Parity Movie',
    sortTitle: 'Parity Movie',
    year: 2026,
  };
  const series = {
    id: 7,
    tvdbId: 70,
    title: 'Parity Series',
    sortTitle: 'Parity Series',
    year: 2026,
  };
  const season = {
    id: 11,
    seriesId: 7,
    seasonNumber: 1,
    title: 'Season 1',
  };
  const episode = {
    id: 42,
    seriesId: 7,
    seasonId: 11,
    tvdbId: 420,
    seasonNumber: 1,
    episodeNumber: 1,
    title: 'Parity Episode',
    airDateUtc: '2026-07-29T00:00:00.000Z',
  };
  return {
    movie: {
      findMany: vi.fn().mockResolvedValue([movie]),
      findUnique: vi.fn().mockResolvedValue(movie),
    },
    series: {
      findMany: vi.fn().mockResolvedValue([series]),
      findUnique: vi.fn().mockResolvedValue(series),
    },
    season: {
      findMany: vi.fn().mockResolvedValue([season]),
      findUnique: vi.fn().mockResolvedValue(season),
    },
    episode: {
      findMany: vi.fn().mockResolvedValue([episode]),
      findUnique: vi.fn().mockResolvedValue(episode),
    },
    playbackProgress: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
  };
}

function createPlaybackService() {
  const state = {
    position: 0,
    duration: 10,
    progress: 0,
    isWatched: false,
    lastWatched: null,
  };
  return {
    resolveStreamSource: vi.fn().mockResolvedValue({
      mediaType: 'EPISODE',
      mediaId: 42,
      title: 'Parity Episode',
      filePath: mediaPath,
    }),
    getProgress: vi.fn().mockResolvedValue(null),
    getContinueWatching: vi.fn().mockResolvedValue([]),
    recordHeartbeat: vi.fn().mockResolvedValue(state),
    markWatched: vi.fn().mockResolvedValue({ ...state, isWatched: true }),
    markUnwatched: vi.fn().mockResolvedValue(state),
  };
}

beforeAll(async () => {
  mediaDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'mediarr-jellyfin-parity-'));
  mediaPath = path.join(mediaDirectory, 'episode.mp4');
  await fs.writeFile(mediaPath, '0123456789', 'utf8');
});

afterAll(async () => {
  await fs.rm(mediaDirectory, { recursive: true, force: true });
});

describe('known-good Jellyfin declaration parity', () => {
  it('keeps the portable endpoint matrix synchronized with the local serve.py when available', async () => {
    const referencePath = process.env.JELLYFIN_REFERENCE_SERVE_PATH
      ?? '/media/daniel-bo/320GB/serve.py';
    if (!existsSync(referencePath)) return;

    const source = await fs.readFile(referencePath, 'utf8');
    const expected = KNOWN_GOOD_ENDPOINTS
      .map(endpoint => declarationKey(endpoint.method, endpoint.path))
      .sort();

    expect(parsePythonDeclarations(source)).toEqual(expected);
  });

  it('declares every known-good verb and normalized path in the Fastify factory', async () => {
    const sourcePath = fileURLToPath(new URL('./createJellyfinServer.ts', import.meta.url));
    const source = await fs.readFile(sourcePath, 'utf8');
    const declared = new Set(parseFastifyDeclarations(source));

    for (const endpoint of KNOWN_GOOD_ENDPOINTS) {
      expect(
        declared.has(declarationKey(endpoint.method, endpoint.path)),
        `${endpoint.method} ${endpoint.path}`,
      ).toBe(true);
    }
  });

  it('returns the known-good basic status for every HTTP declaration', async () => {
    const app = createJellyfinServer({
      prisma: createPrismaFixture(),
      playbackService: createPlaybackService(),
    } as any, {
      serverId: 'declaration-parity',
      serverName: 'Mediarr',
      lanAddress: '192.168.1.42',
    });

    try {
      for (const endpoint of KNOWN_GOOD_ENDPOINTS) {
        if (endpoint.method === 'WEBSOCKET') continue;
        const payload = requestPayload(endpoint);
        const response = await app.inject({
          method: endpoint.method,
          url: requestPath(endpoint.path),
          ...(payload === undefined ? {} : { payload }),
          ...(endpoint.path === '/ClientLog/Document'
            ? { headers: { 'content-type': 'text/plain' } }
            : {}),
        });
        expect(
          response.statusCode,
          `${endpoint.method} ${endpoint.path}: ${response.body}`,
        ).toBe(endpoint.status);
      }
    } finally {
      await app.close();
    }
  });

  it('upgrades the known-good socket declaration and preserves KeepAlive', async () => {
    const app = createJellyfinServer({
      prisma: createPrismaFixture(),
      playbackService: createPlaybackService(),
    } as any, {
      serverId: 'declaration-parity',
      serverName: 'Mediarr',
    });

    try {
      await app.ready();
      const socket = await app.injectWS('/socket');
      const response = new Promise<string>((resolve, reject) => {
        socket.once('message', (raw: { toString(): string }) => resolve(raw.toString()));
        socket.once('error', reject);
      });
      socket.send('{"MessageType":"KeepAlive"}');
      await expect(response).resolves.toBe('{"MessageType":"KeepAlive"}');
      socket.close();
    } finally {
      await app.close();
    }
  });
});
