import { describe, expect, it, vi } from 'vitest';
import { Scheduler } from './Scheduler';

describe('Scheduler subtitle automation scheduling', () => {
  it('schedules subtitle wanted search job and runs callback', async () => {
    const scheduler = new Scheduler();
    const subtitleAutomationService = {
      runAutomationCycle: vi.fn().mockResolvedValue({}),
    };

    scheduler.scheduleSubtitleWantedSearch(
      subtitleAutomationService,
      'subtitle-test-job',
      '*/30 * * * *',
    );

    expect(scheduler.isScheduled('subtitle-test-job')).toBe(true);
    await scheduler.runNow('subtitle-test-job');
    expect(subtitleAutomationService.runAutomationCycle).toHaveBeenCalledOnce();

    scheduler.stopAll();
  });
});
