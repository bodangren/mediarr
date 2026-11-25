import { describe, expect, it, vi } from 'vitest';
import { HeavyJobGate, runExclusiveHeavyJob } from './HeavyJobGate';

describe('HeavyJobGate', () => {
  it('lets one heavy job hold the gate at a time', () => {
    const gate = new HeavyJobGate();
    expect(gate.tryEnter('library-scan')).toBe(true);
    expect(gate.tryEnter('folder-import')).toBe(false);
    expect(gate.owner()).toBe('library-scan');
    gate.leave('library-scan');
    expect(gate.owner()).toBeNull();
    expect(gate.tryEnter('folder-import')).toBe(true);
  });

  it('ignores a release from a job that does not own the gate', () => {
    const gate = new HeavyJobGate();
    gate.tryEnter('library-scan');
    gate.leave('folder-import');
    expect(gate.owner()).toBe('library-scan');
  });

  it('skips and logs the body while another heavy job is running', async () => {
    const gate = new HeavyJobGate();
    const log = vi.fn();
    const body = vi.fn(async () => undefined);
    gate.tryEnter('episode-thumbnails');

    const ran = await runExclusiveHeavyJob(gate, 'youtube-download', body, log);

    expect(ran).toBe(false);
    expect(body).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(
      'youtube-download: deferred while episode-thumbnails is running a heavy maintenance pass.',
    );
    expect(gate.owner()).toBe('episode-thumbnails');
  });

  it('releases the gate even when the body throws', async () => {
    const gate = new HeavyJobGate();
    const log = vi.fn();
    await expect(runExclusiveHeavyJob(gate, 'folder-import', async () => {
      throw new Error('scan exploded');
    }, log)).rejects.toThrow('scan exploded');
    expect(gate.owner()).toBeNull();
  });

  it('runs the body and releases when the gate is free', async () => {
    const gate = new HeavyJobGate();
    const body = vi.fn(async () => undefined);
    const ran = await runExclusiveHeavyJob(gate, 'music-scan', body, vi.fn());
    expect(ran).toBe(true);
    expect(body).toHaveBeenCalledTimes(1);
    expect(gate.owner()).toBeNull();
  });
});
