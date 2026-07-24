import { describe, expect, it, vi } from 'vitest';
import { FfprobeMetadataProbe, type FfprobeExecutor } from './FfprobeMetadataProbe';

describe('FfprobeMetadataProbe', () => {
  it('passes an untrusted path as one execFile argument without a shell', async () => {
    const execute = vi.fn<FfprobeExecutor>().mockResolvedValue({
      stdout: '{"streams":[{"index":0}]}',
    });
    const probe = new FfprobeMetadataProbe(execute);
    const filePath = '/media/movie; touch /tmp/should-not-run.mkv';

    await expect(probe.probe(filePath)).resolves.toEqual({
      streams: [{ index: 0 }],
    });
    expect(execute).toHaveBeenCalledWith(
      'ffprobe',
      ['-v', 'error', '-show_streams', '-of', 'json', filePath],
      { maxBuffer: 8 * 1024 * 1024 },
    );
  });

  it('propagates process failures', async () => {
    const failure = new Error('ffprobe unavailable');
    const execute = vi.fn<FfprobeExecutor>().mockRejectedValue(failure);
    const probe = new FfprobeMetadataProbe(execute);

    await expect(probe.probe('/media/movie.mkv')).rejects.toBe(failure);
  });

  it('propagates invalid JSON failures', async () => {
    const execute = vi.fn<FfprobeExecutor>().mockResolvedValue({
      stdout: 'not-json',
    });
    const probe = new FfprobeMetadataProbe(execute);

    await expect(probe.probe('/media/movie.mkv')).rejects.toBeInstanceOf(SyntaxError);
  });
});
