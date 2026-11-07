import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  SubtitleSyncService,
  type Aligner,
  type AlignResult,
  type Candidate,
} from './SubtitleSyncService';

const SRT = '1\n00:00:01,000 --> 00:00:02,000\n你好\n';

function fakeAligner(result: AlignResult | Error): Aligner & { calls: number } {
  const aligner = {
    calls: 0,
    async run(_video: string, _input: string, output: string): Promise<AlignResult> {
      aligner.calls += 1;
      if (result instanceof Error) throw result;
      await fs.writeFile(output, SRT, 'utf-8');
      return result;
    },
  };
  return aligner;
}

describe('SubtitleSyncService', () => {
  let dir: string;
  let video: string;
  let srt: string;
  let statePath: string;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'subsync-test-'));
    video = path.join(dir, 'episode.mkv');
    srt = path.join(dir, 'episode.zho.srt');
    statePath = path.join(dir, 'state.json');
    await fs.writeFile(video, 'video-bytes');
    await fs.writeFile(srt, SRT);
  });

  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  const candidates = (): Promise<Candidate[]> => Promise.resolve([{ videoPath: video, srtPath: srt }]);

  it('aligns a fresh sidecar, verifies it, and keeps a backup of the original', async () => {
    const aligner = fakeAligner({ offsetSeconds: 0, scale: 1 });
    const service = new SubtitleSyncService({ statePath, candidates, aligner });

    const result = await service.runCycle({ limit: 5 });

    expect(result.aligned).toBe(1);
    expect(aligner.calls).toBe(2); // align + verify pass
    await expect(fs.readFile(srt + '.orig', 'utf-8')).resolves.toBe(SRT);
    const state = JSON.parse(await fs.readFile(statePath, 'utf-8'));
    const entry = Object.values(state.entries)[0] as any;
    expect(entry.status).toBe('ok');
    expect(entry.offsetSeconds).toBe(0);
  });

  it('skips an unchanged sidecar that was already synced (idempotent)', async () => {
    const aligner = fakeAligner({ offsetSeconds: 0, scale: 1 });
    const service = new SubtitleSyncService({ statePath, candidates, aligner });
    await service.runCycle({ limit: 5 });

    const second = await service.runCycle({ limit: 5 });

    expect(second.aligned).toBe(0);
    expect(second.skipped).toBe(1);
    expect(aligner.calls).toBe(2); // no extra align/verify calls
  });

  it('re-aligns when the sidecar changes', async () => {
    const aligner = fakeAligner({ offsetSeconds: 0, scale: 1 });
    const service = new SubtitleSyncService({ statePath, candidates, aligner });
    await service.runCycle({ limit: 5 });

    await fs.writeFile(srt, SRT + '2\n00:00:03,000 --> 00:00:04,000\n再见\n');
    const second = await service.runCycle({ limit: 5 });

    expect(second.aligned).toBe(1);
    expect(aligner.calls).toBe(4);
  });

  it('rejects an alignment whose verification residual is out of bounds and keeps the original', async () => {
    // First pass says 0, second verification pass reports a large residual.
    let call = 0;
    const aligner: Aligner = {
      async run(_video, _input, output) {
        call += 1;
        await fs.writeFile(output, SRT, 'utf-8');
        return call === 1 ? { offsetSeconds: 0, scale: 1 } : { offsetSeconds: 4.2, scale: 1 };
      },
    };
    const service = new SubtitleSyncService({ statePath, candidates, aligner });

    const result = await service.runCycle({ limit: 5 });

    expect(result.failed).toBe(1);
    expect(result.aligned).toBe(0);
    await expect(fs.readFile(srt, 'utf-8')).resolves.toBe(SRT); // untouched
  });

  it('records a failure and retries up to the attempt cap', async () => {
    const aligner = fakeAligner(new Error('ffsubsync exploded'));
    const service = new SubtitleSyncService({ statePath, candidates, aligner });

    const first = await service.runCycle({ limit: 5 });
    expect(first.failed).toBe(1);
    let state = JSON.parse(await fs.readFile(statePath, 'utf-8'));
    let entry = Object.values(state.entries)[0] as any;
    expect(entry.status).toBe('failed');
    expect(entry.attempts).toBe(1);

    await service.runCycle({ limit: 5 });
    await service.runCycle({ limit: 5 });
    const fourth = await service.runCycle({ limit: 5 });
    state = JSON.parse(await fs.readFile(statePath, 'utf-8'));
    entry = Object.values(state.entries)[0] as any;
    expect(entry.status).toBe('gave_up');
    expect(fourth.skipped + fourth.failed).toBe(1);
  });

  it('honours the per-cycle limit', async () => {
    const otherVideo = path.join(dir, 'other.mkv');
    const otherSrt = path.join(dir, 'other.zho.srt');
    await fs.writeFile(otherVideo, 'v');
    await fs.writeFile(otherSrt, SRT);
    const two = (): Promise<Candidate[]> => Promise.resolve([
      { videoPath: video, srtPath: srt },
      { videoPath: otherVideo, srtPath: otherSrt },
    ]);
    const aligner = fakeAligner({ offsetSeconds: 0, scale: 1 });
    const service = new SubtitleSyncService({ statePath, candidates: two, aligner });

    const result = await service.runCycle({ limit: 1 });

    expect(result.aligned).toBe(1);
    expect(aligner.calls).toBe(2);
  });
});
