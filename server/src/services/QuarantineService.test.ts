import { describe, expect, it, vi } from 'vitest';
import {
  deleteQuarantined,
  executeQuarantine,
  planQuarantine,
  restoreQuarantine,
  type QuarantineFs,
} from './QuarantineService';

const MEDIA = '/data/Porn';
const QUARANTINE = '/data/Quarantine';

function fakeFs(overrides: Partial<QuarantineFs> = {}): QuarantineFs & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    mkdir: vi.fn(async (dir: string) => { calls.push(`mkdir:${dir}`); }),
    rename: vi.fn(async (from: string, to: string) => { calls.push(`rename:${from}->${to}`); }),
    copyFile: vi.fn(async (from: string, to: string) => { calls.push(`copy:${from}->${to}`); }),
    unlink: vi.fn(async (file: string) => { calls.push(`unlink:${file}`); }),
    stat: vi.fn(async () => ({ size: 10 })),
    ...overrides,
  } as QuarantineFs & { calls: string[] };
}

describe('planQuarantine', () => {
  it('maps media files into the quarantine root preserving the relative path', () => {
    const plan = planQuarantine([`${MEDIA}/001 [a].mp4`, `${MEDIA}/Little Asians/scene.mp4`], {
      mediaRoot: MEDIA,
      quarantineRoot: QUARANTINE,
    });
    expect(plan.entries).toEqual([
      { originalPath: `${MEDIA}/001 [a].mp4`, quarantinePath: `${QUARANTINE}/001 [a].mp4` },
      { originalPath: `${MEDIA}/Little Asians/scene.mp4`, quarantinePath: `${QUARANTINE}/Little Asians/scene.mp4` },
    ]);
    expect(plan.skipped).toEqual([]);
  });

  it('refuses paths outside the media root and files already quarantined', () => {
    const plan = planQuarantine([`/etc/passwd`, `${QUARANTINE}/old.mp4`], {
      mediaRoot: MEDIA,
      quarantineRoot: QUARANTINE,
    });
    expect(plan.entries).toEqual([]);
    expect(plan.skipped.map((entry) => entry.reason)).toEqual(['outside the media root', 'already quarantined']);
  });
});

describe('executeQuarantine', () => {
  it('is a dry run by default and touches nothing', async () => {
    const io = fakeFs();
    const plan = planQuarantine([`${MEDIA}/a.mp4`], { mediaRoot: MEDIA, quarantineRoot: QUARANTINE });
    const result = await executeQuarantine(plan, { io });
    expect(result.dryRun).toBe(true);
    expect(result.moved).toEqual([`${MEDIA}/a.mp4`]);
    expect(io.calls).toEqual([]);
  });

  it('moves files and writes a manifest line when dryRun is false', async () => {
    const io = fakeFs();
    const plan = planQuarantine([`${MEDIA}/a.mp4`], { mediaRoot: MEDIA, quarantineRoot: QUARANTINE });
    const result = await executeQuarantine(plan, { io, dryRun: false });
    expect(result.failed).toEqual([]);
    expect(io.calls).toContain(`mkdir:${QUARANTINE}`);
    expect(io.calls).toContain(`rename:${MEDIA}/a.mp4->${QUARANTINE}/a.mp4`);
    expect(JSON.parse(result.manifestLines[0]!)).toMatchObject({
      action: 'quarantine',
      originalPath: `${MEDIA}/a.mp4`,
      quarantinePath: `${QUARANTINE}/a.mp4`,
    });
  });

  it('falls back to copy+verify+unlink across devices (EXDEV)', async () => {
    const io = fakeFs({
      rename: vi.fn(async () => { const error = new Error('EXDEV') as NodeJS.ErrnoException; error.code = 'EXDEV'; throw error; }),
    });
    const plan = planQuarantine([`${MEDIA}/a.mp4`], { mediaRoot: MEDIA, quarantineRoot: QUARANTINE });
    const result = await executeQuarantine(plan, { io, dryRun: false });
    expect(result.failed).toEqual([]);
    expect(io.calls).toContain(`copy:${MEDIA}/a.mp4->${QUARANTINE}/a.mp4`);
    expect(io.calls).toContain(`unlink:${MEDIA}/a.mp4`);
  });

  it('reports a failed move instead of pretending it succeeded', async () => {
    const io = fakeFs({ rename: vi.fn(async () => { throw new Error('permission denied'); }) });
    const plan = planQuarantine([`${MEDIA}/a.mp4`], { mediaRoot: MEDIA, quarantineRoot: QUARANTINE });
    const result = await executeQuarantine(plan, { io, dryRun: false });
    expect(result.moved).toEqual([]);
    expect(result.failed).toEqual([{ path: `${MEDIA}/a.mp4`, error: 'permission denied' }]);
  });
});

describe('restoreQuarantine', () => {
  it('moves a quarantined file home and refuses paths outside quarantine', async () => {
    const io = fakeFs();
    const result = await restoreQuarantine(
      [
        { originalPath: `${MEDIA}/a.mp4`, quarantinePath: `${QUARANTINE}/a.mp4` },
        { originalPath: `${MEDIA}/b.mp4`, quarantinePath: '/etc/shadow' },
      ],
      { io, quarantineRoot: QUARANTINE },
    );
    expect(result.moved).toEqual([`${QUARANTINE}/a.mp4`]);
    expect(result.failed[0]?.error).toContain('outside quarantine');
  });
});

describe('deleteQuarantined', () => {
  it('refuses to delete media files', async () => {
    const io = fakeFs();
    const result = await deleteQuarantined([`${MEDIA}/a.mp4`], { io, quarantineRoot: QUARANTINE, dryRun: false });
    expect(result.moved).toEqual([]);
    expect(result.failed[0]?.error).toContain('outside the quarantine root');
    expect(io.calls).toEqual([]);
  });

  it('deletes inside the quarantine root and manifests it', async () => {
    const io = fakeFs();
    const result = await deleteQuarantined([`${QUARANTINE}/a.mp4`], { io, quarantineRoot: QUARANTINE, dryRun: false });
    expect(result.moved).toEqual([`${QUARANTINE}/a.mp4`]);
    expect(JSON.parse(result.manifestLines[0]!)).toMatchObject({ action: 'delete' });
  });
});
