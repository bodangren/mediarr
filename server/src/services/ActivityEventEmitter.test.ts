import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ActivityEventEmitter } from './ActivityEventEmitter';
import type { ActivityEventRepository } from '../repositories/ActivityEventRepository';

// Sibling coverage for ActivityEventEmitter (chore_remaining_server_service_coverage_20260728).
//
// Baseline was 0% — the file had no coverage at all. Note the honest scope: this
// class is a 1-branch delegation shim, so full coverage here certifies very
// little. Its real conditional surface lives in ActivityEventRepository, which
// has its own tests. The one behaviour worth pinning is the optional-repository
// contract: services construct this with an undefined repository in some wiring
// paths, and emit() must stay a silent no-op rather than throwing.

const makeRepository = () =>
  ({ create: vi.fn().mockResolvedValue(undefined) }) as unknown as ActivityEventRepository & {
    create: ReturnType<typeof vi.fn>;
  };

const EVENT = {
  type: 'grab',
  message: 'Grabbed a release',
} as never;

describe('ActivityEventEmitter', () => {
  let repository: ReturnType<typeof makeRepository>;

  beforeEach(() => {
    repository = makeRepository();
  });

  it('delegates the event to the repository unchanged', async () => {
    const emitter = new ActivityEventEmitter(repository);

    await emitter.emit(EVENT);

    expect(repository.create).toHaveBeenCalledTimes(1);
    expect(repository.create).toHaveBeenCalledWith(EVENT);
  });

  it('awaits the repository write rather than firing and forgetting', async () => {
    let settled = false;
    repository.create.mockImplementation(
      () =>
        new Promise<void>(resolve => {
          setTimeout(() => {
            settled = true;
            resolve();
          }, 0);
        }),
    );
    const emitter = new ActivityEventEmitter(repository);

    await emitter.emit(EVENT);

    expect(settled).toBe(true);
  });

  it('propagates a repository failure to the caller', async () => {
    const failure = new Error('database unavailable');
    repository.create.mockRejectedValue(failure);
    const emitter = new ActivityEventEmitter(repository);

    await expect(emitter.emit(EVENT)).rejects.toThrow('database unavailable');
  });

  describe('without a repository', () => {
    it('is a silent no-op when none is supplied', async () => {
      const emitter = new ActivityEventEmitter();

      await expect(emitter.emit(EVENT)).resolves.toBeUndefined();
    });

    it('is a silent no-op when one is explicitly undefined', async () => {
      const emitter = new ActivityEventEmitter(undefined);

      await expect(emitter.emit(EVENT)).resolves.toBeUndefined();
    });
  });
});
