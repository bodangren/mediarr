import { EventEmitter } from 'node:events';
import { describe, expect, it, vi } from 'vitest';
import { FfsubsyncAligner } from './FfsubsyncAligner';

/** Minimal child-process stand-in: streams + the events FfsubsyncAligner listens for. */
class FakeChild extends EventEmitter {
  readonly stdout = new EventEmitter();
  readonly stderr = new EventEmitter();
  readonly kill = vi.fn();
}

describe('FfsubsyncAligner', () => {
  it('runs the aligner at low priority with a single BLAS/OpenMP thread', async () => {
    const child = new FakeChild();
    const spawnImpl = vi.fn(() => child);
    const aligner = new FfsubsyncAligner({
      bin: '/venv/bin/ffsubsync',
      spawnImpl: spawnImpl as never,
    });

    const pending = aligner.run('/data/TV/Show/ep.mkv', '/tmp/in.zho.srt', '/tmp/out.zho.srt');
    queueMicrotask(() => {
      child.stderr.emit('data', Buffer.from(
        'offset seconds: 25.5\nframerate scale factor: 1.001\n',
      ));
      child.emit('close', 0);
    });
    await expect(pending).resolves.toEqual({ offsetSeconds: 25.5, scale: 1.001 });

    expect(spawnImpl).toHaveBeenCalledTimes(1);
    const [command, args, options] = spawnImpl.mock.calls[0] as unknown as [string, string[], {
      env?: Record<string, string>;
    }];
    // Same shape as YoutubeDownloadService's media children: do not outrank the stream.
    expect(command).toBe('nice');
    expect(args.slice(0, 5)).toEqual(['-n', '19', 'ionice', '-c', '3']);
    expect(args[5]).toBe('/venv/bin/ffsubsync');
    expect(args.slice(6)).toEqual([
      '/data/TV/Show/ep.mkv', '-i', '/tmp/in.zho.srt', '-o', '/tmp/out.zho.srt',
      '--max-offset-seconds', '30',
    ]);
    // Single-threaded FFT: a 14-minute cycle at 8 threads starved the API for 392 s (2026-11-28).
    expect(options.env).toMatchObject({
      OMP_NUM_THREADS: '1',
      OPENBLAS_NUM_THREADS: '1',
      MKL_NUM_THREADS: '1',
      NUMEXPR_NUM_THREADS: '1',
    });
  });

  it('still rejects a run that reports no offset', async () => {
    const child = new FakeChild();
    const aligner = new FfsubsyncAligner({
      bin: '/venv/bin/ffsubsync',
      spawnImpl: (() => child) as never,
    });
    const pending = aligner.run('/data/TV/Show/ep.mkv', '/tmp/in.srt', '/tmp/out.srt');
    queueMicrotask(() => {
      child.stderr.emit('data', Buffer.from('done with no numbers\n'));
      child.emit('close', 0);
    });
    await expect(pending).rejects.toThrow('ffsubsync reported no offset/scale');
  });
});
