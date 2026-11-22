import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  MEDIA_FILE_EXTENSIONS,
  SubtitleSyncService,
  type Aligner,
  type AlignResult,
  type Candidate,
  findSidecarCandidates,
  summarizeSyncState,
  orderCandidatesByRecentPlayback,
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
  it('skips a gave_up sidecar only while its stored hash proves it is unchanged', async () => {
    const { createHash } = await import('node:crypto');
    const hash = createHash('sha256').update(SRT).digest('hex');
    await fs.writeFile(statePath, JSON.stringify({
      version: 1,
      entries: { [srt]: { status: 'gave_up', attempts: 3, srtSha256: hash, videoSize: 11 } },
    }));
    const aligner = fakeAligner({ offsetSeconds: 0, scale: 1 });
    const service = new SubtitleSyncService({ statePath, candidates, aligner });

    const result = await service.runCycle({ limit: 5 });

    expect(result.skipped).toBe(1);
    expect(aligner.calls).toBe(0);
  });

  it('re-runs a gave_up sidecar after the file was repaired', async () => {
    await fs.writeFile(statePath, JSON.stringify({
      version: 1,
      entries: { [srt]: { status: 'gave_up', attempts: 3, srtSha256: 'stale-hash', videoSize: 11 } },
    }));
    const aligner = fakeAligner({ offsetSeconds: 0, scale: 1 });
    const service = new SubtitleSyncService({ statePath, candidates, aligner });

    const result = await service.runCycle({ limit: 5 });

    expect(result.aligned).toBe(1);
    expect(aligner.calls).toBe(2);
    const state = JSON.parse(await fs.readFile(statePath, 'utf-8'));
    expect((Object.values(state.entries)[0] as { status: string }).status).toBe('ok');
  });

  it('retries a legacy gave_up entry that has no stored hash, once', async () => {
    await fs.writeFile(statePath, JSON.stringify({
      version: 1,
      entries: { [srt]: { status: 'gave_up', attempts: 3 } },
    }));
    const aligner = fakeAligner(new Error('still broken'));
    const service = new SubtitleSyncService({ statePath, candidates, aligner });

    const result = await service.runCycle({ limit: 5 });

    expect(result.failed).toBe(1);
    const state = JSON.parse(await fs.readFile(statePath, 'utf-8'));
    const entry = Object.values(state.entries)[0] as { status: string; attempts: number };
    // One new failure is enough to give up again, instead of churning three more cycles.
    expect(entry.status).toBe('gave_up');
    expect(aligner.calls).toBe(1);
  });
});

describe('orderCandidatesByRecentPlayback', () => {
  const candidates = [
    { videoPath: '/tv/a.mkv', srtPath: '/tv/a.zho.srt' },
    { videoPath: '/tv/b.mkv', srtPath: '/tv/b.zho.srt' },
    { videoPath: '/tv/c.mkv', srtPath: '/tv/c.zho.srt' },
  ];

  it('puts recently played videos first, preserving order inside groups', () => {
    const ordered = orderCandidatesByRecentPlayback(candidates, ['/tv/c.mkv', '/tv/a.mkv']);
    expect(ordered.map((candidate) => candidate.videoPath)).toEqual(['/tv/c.mkv', '/tv/a.mkv', '/tv/b.mkv']);
  });

  it('is a no-op without playback history', () => {
    expect(orderCandidatesByRecentPlayback(candidates, [])).toEqual(candidates);
  });
});

describe('summarizeSyncState', () => {
  it('counts ok/gave_up/failed entries in the ledger', () => {
    expect(summarizeSyncState({ entries: {
      a: { status: 'ok' }, b: { status: 'ok' }, c: { status: 'gave_up' }, d: { status: 'failed' }, e: {},
    } })).toEqual({ attempted: 5, ok: 2, gaveUp: 1, failed: 1, other: 1, recentAligned: 0, perHour: 0 });
  });
  it('reports the recent alignment rate and stays additive', () => {
    const now = new Date('2026-11-09T12:00:00Z');
    const summary = summarizeSyncState({ entries: {
      a: { status: 'ok', syncedAt: '2026-11-09T11:00:00Z' },
      b: { status: 'ok', syncedAt: '2026-11-09T06:00:00Z' },
      c: { status: 'ok', syncedAt: '2026-11-01T00:00:00Z' }, // outside the window
      d: { status: 'failed' },
    } }, now);
    expect(summary.ok).toBe(3);
    expect(summary.recentAligned).toBe(2);
    expect(summary.perHour).toBeCloseTo(2 / 24, 5);
    // A shorter window tracks the current cadence: only the 11:00 entry is inside the last 3 hours.
    const short = summarizeSyncState({ entries: {
      a: { status: 'ok', syncedAt: '2026-11-09T11:00:00Z' },
      b: { status: 'ok', syncedAt: '2026-11-09T06:00:00Z' },
    } }, now, 3);
    expect(short.recentAligned).toBe(1);
    expect(short.perHour).toBeCloseTo(1 / 3, 5);
  });


  it('tolerates a missing or corrupt ledger', () => {
    expect(summarizeSyncState(null)).toEqual({ attempted: 0, ok: 0, gaveUp: 0, failed: 0, other: 0, recentAligned: 0, perHour: 0 });
    expect(summarizeSyncState({})).toEqual({ attempted: 0, ok: 0, gaveUp: 0, failed: 0, other: 0, recentAligned: 0, perHour: 0 });
  });
});

describe('findSidecarCandidates', () => {
  it('finds .zho then .zh sidecars next to variant paths and collapses duplicate paths', () => {
    const exists = (candidatePath: string) =>
      candidatePath === '/m/a.zho.srt' || candidatePath === '/m/b.zh.srt' || candidatePath === '/m/c.zho.srt';
    const found = findSidecarCandidates(['/m/a.mkv', '/m/b.mp4', '/m/c.mkv', '/m/d.mkv', '/m/a.mkv'], exists);
    expect(found).toEqual([
      { videoPath: '/m/a.mkv', srtPath: '/m/a.zho.srt' },
      { videoPath: '/m/b.mp4', srtPath: '/m/b.zh.srt' },
      { videoPath: '/m/c.mkv', srtPath: '/m/c.zho.srt' },
    ]);
  });

  it('returns no candidates for empty input and never invents a path', () => {
    const probed: string[] = [];
    const found = findSidecarCandidates(['', '/m/none.mkv'], (candidatePath) => {
      probed.push(candidatePath);
      return false;
    });
    expect(found).toEqual([]);
    expect(probed).toEqual(['/m/none.zho.srt', '/m/none.zh.srt']);
  });

  it('recognises real video files only, so folder-shaped legacy paths are excluded', () => {
    expect(MEDIA_FILE_EXTENSIONS.test('/data/Movies/Film (2023)/Film.mkv')).toBe(true);
    expect(MEDIA_FILE_EXTENSIONS.test('/data/Movies/Film (2023)/Film.MP4')).toBe(true);
    expect(MEDIA_FILE_EXTENSIONS.test('/data/Movies/Film (2023)')).toBe(false);
  });

});
