import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import Fastify from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { encodeJellyfinId } from './ids';
import {
  JELLYFIN_BROWSER_ENTRY_HTML,
  createJellyfinReferenceStreamHandler,
  jellyfinBrowserEntryHandler,
  jellyfinSocketKeepAliveResponse,
} from './referenceSurface';

const cleanupDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(cleanupDirectories.splice(0).map(directory => (
    fs.rm(directory, { recursive: true, force: true })
  )));
});

async function createMediaFixture(contents = '0123456789') {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'mediarr-reference-surface-'));
  cleanupDirectories.push(directory);
  const filePath = path.join(directory, 'episode.mp4');
  await fs.writeFile(filePath, contents, 'utf8');
  return filePath;
}

describe('Jellyfin reference streaming routes', () => {
  it('serves both Audio aliases and Download through the shared range implementation', async () => {
    const filePath = await createMediaFixture();
    const itemId = encodeJellyfinId('episode', 42);
    const resolveStreamSource = vi.fn().mockResolvedValue({ filePath });
    const stream = createJellyfinReferenceStreamHandler({ resolveStreamSource });
    const app = Fastify();
    app.get('/Audio/:id/stream', stream);
    app.get('/Audio/:id/stream.:container', stream);
    app.get('/Items/:id/Download', stream);

    try {
      const responses = await Promise.all([
        app.inject({
          method: 'GET',
          url: `/Audio/${itemId}/stream`,
          headers: { range: 'bytes=2-5' },
        }),
        app.inject({
          method: 'GET',
          url: `/Audio/${itemId}/stream.mp4`,
          headers: { range: 'bytes=6-' },
        }),
        app.inject({
          method: 'GET',
          url: `/Items/${itemId}/Download`,
        }),
      ]);

      expect(responses.map(response => response.statusCode)).toEqual([206, 206, 200]);
      expect(responses[0]?.headers['content-range']).toBe('bytes 2-5/10');
      expect(responses[0]?.body).toBe('2345');
      expect(responses[1]?.headers['content-range']).toBe('bytes 6-9/10');
      expect(responses[1]?.body).toBe('6789');
      expect(responses[2]?.headers['accept-ranges']).toBe('bytes');
      expect(responses[2]?.headers['content-type']).toContain('video/mp4');
      expect(responses[2]?.body).toBe('0123456789');
      expect(resolveStreamSource).toHaveBeenCalledTimes(3);
      expect(resolveStreamSource).toHaveBeenCalledWith({
        mediaType: 'EPISODE',
        mediaId: 42,
      });
    } finally {
      await app.close();
    }
  });

  it('rejects non-playable ids and reports an unavailable playback service', async () => {
    const resolveStreamSource = vi.fn();
    const withService = Fastify();
    withService.get('/Audio/:id/stream', createJellyfinReferenceStreamHandler({
      resolveStreamSource,
    }));
    const withoutService = Fastify();
    withoutService.get('/Items/:id/Download', createJellyfinReferenceStreamHandler());

    try {
      const invalid = await withService.inject('/Audio/not-a-jellyfin-id/stream');
      const unavailable = await withoutService.inject(
        `/Items/${encodeJellyfinId('movie', 1)}/Download`,
      );

      expect(invalid.statusCode).toBe(404);
      expect(unavailable.statusCode).toBe(503);
      expect(resolveStreamSource).not.toHaveBeenCalled();
    } finally {
      await withService.close();
      await withoutService.close();
    }
  });
});

describe('Jellyfin browser and socket compatibility', () => {
  it('provides one browser entry document for /, /web, and /web/', async () => {
    const app = Fastify();
    app.get('/', jellyfinBrowserEntryHandler);
    app.get('/web', jellyfinBrowserEntryHandler);
    app.get('/web/', jellyfinBrowserEntryHandler);

    try {
      const responses = await Promise.all([
        app.inject('/'),
        app.inject('/web'),
        app.inject('/web/'),
      ]);

      expect(responses.map(response => response.statusCode)).toEqual([200, 200, 200]);
      expect(responses.map(response => response.body)).toEqual([
        JELLYFIN_BROWSER_ENTRY_HTML,
        JELLYFIN_BROWSER_ENTRY_HTML,
        JELLYFIN_BROWSER_ENTRY_HTML,
      ]);
      for (const response of responses) {
        expect(response.headers['content-type']).toContain('text/html');
        expect(response.body).toContain('<title>Mediarr</title>');
      }
    } finally {
      await app.close();
    }
  });

  it('echoes Jellyfin KeepAlive messages and ignores invalid or unrelated frames', () => {
    expect(jellyfinSocketKeepAliveResponse('{"MessageType":"KeepAlive"}')).toBe(
      '{"MessageType":"KeepAlive"}',
    );
    expect(jellyfinSocketKeepAliveResponse('{"MessageType":"Sessions"}')).toBeNull();
    expect(jellyfinSocketKeepAliveResponse('not-json')).toBeNull();
    expect(jellyfinSocketKeepAliveResponse('null')).toBeNull();
  });
});
