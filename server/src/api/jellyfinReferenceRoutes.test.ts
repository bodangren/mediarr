import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { encodeJellyfinId } from '../jellyfin/ids';
import { createJellyfinServer } from './createJellyfinServer';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(directory => (
    fs.rm(directory, { recursive: true, force: true })
  )));
});

function createPrismaFixture() {
  const empty = vi.fn().mockResolvedValue([]);
  const missing = vi.fn().mockResolvedValue(null);
  return {
    movie: { findMany: empty, findUnique: missing },
    series: { findMany: empty, findUnique: missing },
    season: { findMany: empty, findUnique: missing },
    episode: { findMany: empty, findUnique: missing },
    playbackProgress: { findFirst: missing },
  };
}

async function createMediaFixture() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'mediarr-jellyfin-routes-'));
  temporaryDirectories.push(directory);
  const filePath = path.join(directory, 'episode.mp4');
  await fs.writeFile(filePath, '0123456789', 'utf8');
  return filePath;
}

function createApp(filePath: string) {
  return createJellyfinServer({
    prisma: createPrismaFixture(),
    playbackService: {
      resolveStreamSource: vi.fn().mockResolvedValue({
        mediaType: 'EPISODE',
        mediaId: 42,
        title: 'Reference Episode',
        filePath,
      }),
    },
  } as any, {
    serverId: 'reference-route-test',
    serverName: 'Mediarr',
    lanAddress: '192.168.1.42',
  });
}

describe('Jellyfin reference routes', () => {
  it('serves the Audio alias and Download with the shared byte-range contract', async () => {
    const filePath = await createMediaFixture();
    const itemId = encodeJellyfinId('episode', 42);
    const app = createApp(filePath);

    try {
      const audio = await app.inject({
        method: 'GET',
        url: `/Audio/${itemId}/stream.mp4`,
        headers: { range: 'bytes=1-4' },
      });
      const download = await app.inject({
        method: 'GET',
        url: `/Items/${itemId}/Download`,
        headers: { range: 'bytes=6-' },
      });

      expect(audio.statusCode).toBe(206);
      expect(audio.headers['content-range']).toBe('bytes 1-4/10');
      expect(audio.headers['accept-ranges']).toBe('bytes');
      expect(audio.body).toBe('1234');
      expect(download.statusCode).toBe(206);
      expect(download.headers['content-range']).toBe('bytes 6-9/10');
      expect(download.body).toBe('6789');
    } finally {
      await app.close();
    }
  });

  it('serves the same HTML shell from root and both web aliases', async () => {
    const app = createApp(await createMediaFixture());

    try {
      const responses = await Promise.all([
        app.inject('/'),
        app.inject('/web'),
        app.inject('/web/'),
      ]);

      expect(responses.map(response => response.statusCode)).toEqual([200, 200, 200]);
      expect(new Set(responses.map(response => response.body))).toHaveLength(1);
      for (const response of responses) {
        expect(response.headers['content-type']).toContain('text/html');
        expect(response.body).toContain('<title>Mediarr</title>');
      }
    } finally {
      await app.close();
    }
  });

  it('accepts a socket upgrade and replies to Jellyfin KeepAlive', async () => {
    const app = createApp(await createMediaFixture());

    try {
      await app.ready();
      const socket = await app.injectWS('/socket');
      const response = new Promise<string>((resolve, reject) => {
        socket.once('message', (raw: { toString(): string }) => resolve(raw.toString()));
        socket.once('error', reject);
      });

      socket.send(JSON.stringify({ MessageType: 'KeepAlive' }));

      await expect(response).resolves.toBe('{"MessageType":"KeepAlive"}');
      socket.close();
    } finally {
      await app.close();
    }
  });
});
