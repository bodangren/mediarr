import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createApiServer } from './createApiServer';

async function createTempMediaFile(contents: string): Promise<{ dir: string; filePath: string }> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'mediarr-playback-int-'));
  const filePath = path.join(dir, 'fixture.mp4');
  await fs.writeFile(filePath, contents, 'utf-8');
  return { dir, filePath };
}

describe('playback streaming integration', () => {
  const tempDirectories: string[] = [];

  afterEach(async () => {
    await Promise.all(tempDirectories.map(dir => fs.rm(dir, { recursive: true, force: true })));
    tempDirectories.length = 0;
  });

  it('serves 206 Partial Content through the full api server wiring', async () => {
    const fixture = await createTempMediaFile('abcdefghijklmnopqrstuvwxyz');
    tempDirectories.push(fixture.dir);

    const playbackService = {
      resolveStreamSource: vi.fn().mockResolvedValue({
        mediaType: 'MOVIE',
        mediaId: 5,
        title: 'Fixture',
        filePath: fixture.filePath,
      }),
      buildManifest: vi.fn(),
      recordHeartbeat: vi.fn(),
      resolveSubtitleTrack: vi.fn(),
    };

    const app = createApiServer({
      prisma: {},
      playbackService,
    } as any);

    const response = await app.inject({
      method: 'GET',
      url: '/api/stream/5?type=movie',
      headers: {
        range: 'bytes=3-8',
      },
    });

    expect(response.statusCode).toBe(206);
    expect(response.headers['content-range']).toBe('bytes 3-8/26');
    expect(response.body).toBe('defghi');
    expect(playbackService.resolveStreamSource).toHaveBeenCalledWith({
      mediaType: 'MOVIE',
      mediaId: 5,
    });

    await app.close();
  });
});
