import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NotFoundError } from '../errors/domainErrors';
import { encodeJellyfinId } from '../jellyfin/ids';
import { createJellyfinServer } from './createJellyfinServer';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(directory => (
    fs.rm(directory, { recursive: true, force: true })
  )));
});

function createPrismaFixture() {
  const noRows = vi.fn().mockResolvedValue([]);
  const noRow = vi.fn().mockResolvedValue(null);
  return {
    movie: { findMany: noRows, findUnique: noRow },
    series: { findMany: noRows, findUnique: noRow },
    season: { findMany: noRows, findUnique: noRow },
    episode: { findMany: noRows, findUnique: noRow },
    playbackProgress: { findFirst: noRow },
  };
}

function createApp(playbackService?: Record<string, unknown>) {
  return createJellyfinServer({
    prisma: createPrismaFixture(),
    ...(playbackService === undefined ? {} : { playbackService }),
  } as any, {
    serverId: 'direct-play-contract',
    serverName: 'Mediarr',
  });
}

async function createMediaFile(extension: string, contents = '0123456789') {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'mediarr-direct-play-'));
  temporaryDirectories.push(directory);
  const filePath = path.join(directory, `fixture${extension}`);
  await fs.writeFile(filePath, contents);
  return filePath;
}

describe('Jellyfin direct-play wire compatibility', () => {
  it('returns truthful direct-play-only PlaybackInfo for the observed TV POST flow', async () => {
    const itemId = encodeJellyfinId('episode', 42);
    const filePath = await createMediaFile('.m4v');
    const resolveStreamSource = vi.fn().mockResolvedValue({
      mediaType: 'EPISODE',
      mediaId: 42,
      title: 'Observed Episode',
      filePath,
    });
    const app = createApp({ resolveStreamSource });

    try {
      const response = await app.inject({
        method: 'POST',
        url: `/Items/${itemId}/PlaybackInfo`,
        payload: {},
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        MediaSources: [expect.objectContaining({
          Id: itemId,
          Name: 'Observed Episode',
          Path: filePath,
          Protocol: 'File',
          Type: 'Default',
          Container: 'mp4',
          SupportsDirectPlay: true,
          SupportsDirectStream: true,
          SupportsTranscoding: false,
          MediaStreams: [],
          DirectStreamUrl: `/Videos/${itemId}/stream`,
        })],
        PlaySessionId: itemId,
      });
      expect(response.json().MediaSources[0]).not.toHaveProperty('TranscodingUrl');
      expect(resolveStreamSource).toHaveBeenCalledWith({
        mediaType: 'EPISODE',
        mediaId: 42,
      });
    } finally {
      await app.close();
    }
  });

  it('serves the exact observed TV query path with complete 200 and 206 headers', async () => {
    const itemId = encodeJellyfinId('episode', 42);
    const filePath = await createMediaFile('.m4v');
    const resolveStreamSource = vi.fn().mockResolvedValue({
      mediaType: 'EPISODE',
      mediaId: 42,
      title: 'Observed Episode',
      filePath,
    });
    const app = createApp({ resolveStreamSource });
    const observedQuery = [
      'container=mp4',
      'static=true',
      `mediaSourceId=${itemId.replaceAll('-', '')}`,
      'streamOptions=%7B%7D',
      'enableAudioVbrEncoding=true',
    ].join('&');

    try {
      const full = await app.inject(
        `/Videos/${itemId}/stream?${observedQuery}`,
      );
      const partial = await app.inject({
        method: 'GET',
        url: `/Videos/${itemId}/stream?${observedQuery}`,
        headers: { range: 'bytes=2-5' },
      });

      expect(full.statusCode).toBe(200);
      expect(full.headers['content-type']).toContain('video/mp4');
      expect(full.headers['content-length']).toBe('10');
      expect(full.headers['accept-ranges']).toBe('bytes');
      expect(full.body).toBe('0123456789');
      expect(partial.statusCode).toBe(206);
      expect(partial.headers['content-type']).toContain('video/mp4');
      expect(partial.headers['content-range']).toBe('bytes 2-5/10');
      expect(partial.headers['content-length']).toBe('4');
      expect(partial.headers['accept-ranges']).toBe('bytes');
      expect(partial.body).toBe('2345');
    } finally {
      await app.close();
    }
  });

  it('uses the reference TS MIME type and one 416 contract across Audio and Download', async () => {
    const itemId = encodeJellyfinId('movie', 7);
    const filePath = await createMediaFile('.ts');
    const app = createApp({
      resolveStreamSource: vi.fn().mockResolvedValue({
        mediaType: 'MOVIE',
        mediaId: 7,
        title: 'Transport Stream',
        filePath,
      }),
    });

    try {
      const audio = await app.inject({
        method: 'GET',
        url: `/Audio/${itemId}/stream`,
        headers: { range: 'bytes=1-3' },
      });
      const download = await app.inject({
        method: 'GET',
        url: `/Items/${itemId}/Download`,
        headers: { range: 'bytes=999-' },
      });

      expect(audio.statusCode).toBe(206);
      expect(audio.headers['content-type']).toContain('video/mp2t');
      expect(audio.headers['content-range']).toBe('bytes 1-3/10');
      expect(audio.headers['content-length']).toBe('3');
      expect(audio.body).toBe('123');
      expect(download.statusCode).toBe(416);
      expect(download.headers['content-range']).toBe('bytes */10');
      expect(download.headers['accept-ranges']).toBe('bytes');
    } finally {
      await app.close();
    }
  });

  it('maps unavailable records and files to 404 without masking unexpected failures', async () => {
    const itemId = encodeJellyfinId('movie', 8);
    const missingRecord = createApp({
      resolveStreamSource: vi.fn().mockRejectedValue(
        new NotFoundError('Movie 8 has no playable file variants'),
      ),
    });
    const missingFile = createApp({
      resolveStreamSource: vi.fn().mockResolvedValue({
        mediaType: 'MOVIE',
        mediaId: 8,
        title: 'Missing File',
        filePath: '/definitely/missing/mediarr-fixture.mp4',
      }),
    });
    const unexpected = createApp({
      resolveStreamSource: vi.fn().mockRejectedValue(new Error('database unavailable')),
    });

    try {
      const recordResponses = await Promise.all([
        missingRecord.inject(`/Videos/${itemId}/stream`),
        missingRecord.inject(`/Audio/${itemId}/stream`),
        missingRecord.inject(`/Items/${itemId}/Download`),
      ]);
      const fileResponse = await missingFile.inject(`/Videos/${itemId}/stream`);
      const unexpectedResponse = await unexpected.inject(`/Videos/${itemId}/stream`);

      expect(recordResponses.map(response => response.statusCode)).toEqual([404, 404, 404]);
      expect(fileResponse.statusCode).toBe(404);
      expect(unexpectedResponse.statusCode).toBe(500);
    } finally {
      await Promise.all([
        missingRecord.close(),
        missingFile.close(),
        unexpected.close(),
      ]);
    }
  });

  it('keeps invalid ids and an unavailable playback service distinct', async () => {
    const withService = createApp({ resolveStreamSource: vi.fn() });
    const withoutService = createApp();

    try {
      const invalid = await withService.inject('/Videos/not-a-jellyfin-id/stream');
      const unavailable = await withoutService.inject(
        `/Videos/${encodeJellyfinId('movie', 1)}/stream`,
      );

      expect(invalid.statusCode).toBe(404);
      expect(unavailable.statusCode).toBe(503);
    } finally {
      await Promise.all([withService.close(), withoutService.close()]);
    }
  });
});
