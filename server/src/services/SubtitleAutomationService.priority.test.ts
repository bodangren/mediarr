import { describe, expect, it, vi } from 'vitest';
import { SubtitleAutomationService } from './SubtitleAutomationService';

/** The fetch cycle must consume the repository's priority order, not re-sort it. */
function build(rows: Array<{ id: number; variantId: number }>) {
  const processed: number[] = [];
  const repository = {
    listWantedSubtitlesByPriority: vi.fn().mockResolvedValue(rows),
    listWantedSubtitlesByStates: vi.fn(),
    updateWantedSubtitleState: vi.fn(),
  };
  const fetchService = {
    fetchWantedSubtitle: vi.fn(async (id: number) => {
      processed.push(id);
      return {};
    }),
  };
  const service = new SubtitleAutomationService(
    repository as never,
    { get: vi.fn() } as never,
    {} as never,
    {} as never,
    fetchService as never,
    { hasUsableProvider: () => true } as never,
    () => 1,
  );
  return { service, processed, repository, fetchService };
}

describe('SubtitleAutomationService.processWantedQueue — priority order', () => {
  it('processes rows in the order the priority query returned them and stops at the cap', async () => {
    const rows = [
      { id: 91, variantId: 1 },
      { id: 92, variantId: 2 },
      { id: 93, variantId: 3 },
    ];
    const { service, processed, repository } = build(rows);

    const stats = await service.processWantedQueue(3);

    expect(processed).toEqual([91, 92, 93]);
    expect(repository.listWantedSubtitlesByPriority).toHaveBeenCalledWith(
      expect.arrayContaining(['FAILED']),
      3,
    );
    expect(repository.listWantedSubtitlesByStates).not.toHaveBeenCalled();
    expect(stats).toMatchObject({ downloaded: 3, failed: 0, queued: 3, skippedNoProvider: 0 });
  });

  it('falls back to the plain listing when the repository has no priority query', async () => {
    const { service, processed, repository } = build([]);
    (repository as { listWantedSubtitlesByPriority?: unknown }).listWantedSubtitlesByPriority = undefined;
    repository.listWantedSubtitlesByStates.mockResolvedValue([{ id: 7, variantId: 70 }]);

    await service.processWantedQueue(1);

    expect(processed).toEqual([7]);
    expect(repository.listWantedSubtitlesByStates).toHaveBeenCalled();
  });
});
