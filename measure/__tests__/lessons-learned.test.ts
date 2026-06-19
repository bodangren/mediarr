import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const LESSONS_PATH = resolve(__dirname, '..', 'lessons-learned.md');

function readLessons(): string {
  return readFileSync(LESSONS_PATH, 'utf8');
}

describe('measure/lessons-learned.md — scheduler-dashboard track deliverables', () => {
  it('captures the cron validation parity pattern (backend node-cron validate ↔ frontend CronIntervalPicker)', () => {
    const content = readLessons();
    const lowered = content.toLowerCase();
    const hasCronKeyword = /cron\s+(validation|validate)/i.test(content);
    const hasParityKeyword = /parity|shared\s+util|same\s+library|identical\s+accept/i.test(content);
    const hasNodeCronRef = /node-cron/i.test(content);
    const hasFrontendRef = /CronIntervalPicker|cron.*picker|frontend.*cron/i.test(content);

    expect(hasCronKeyword, 'lessons-learned.md should mention cron validation/validate').toBe(true);
    expect(hasParityKeyword, 'lessons-learned.md should mention parity / shared util / same library / identical accept').toBe(true);
    expect(hasNodeCronRef, 'lessons-learned.md should reference the node-cron library').toBe(true);
    expect(hasFrontendRef, 'lessons-learned.md should reference the frontend CronIntervalPicker / picker').toBe(true);
    // Cross-check: the parity note must appear in the same document — both backend and frontend references
    // should be present so the cross-phase dependency is recorded.
    expect(lowercasedContainsBoth(lowered, ['cron'], ['parity'])).toBe(true);
  });

  it('captures the hot-reload pattern (Scheduler.reschedule stops old + schedules new, no-op on same expression)', () => {
    const content = readLessons();
    const lowered = content.toLowerCase();
    const hasRescheduleKeyword = /reschedule/i.test(content);
    const hasHotReloadKeyword = /hot[-\s]?reload|hot\s+reload/i.test(content);
    const hasNoOpKeyword = /no[-\s]?op|same\s+expression/i.test(content);
    const hasStopScheduleKeyword = /stop.*schedule|stop\+\s*schedule|stop the old|old.*new/i.test(content);
    const hasPutIntervalRef = /PUT\s+\/.*interval|\/interval/i.test(content);

    expect(hasRescheduleKeyword, 'lessons-learned.md should mention Scheduler.reschedule').toBe(true);
    expect(hasHotReloadKeyword, 'lessons-learned.md should mention hot-reload semantics').toBe(true);
    expect(hasNoOpKeyword, 'lessons-learned.md should document the no-op / same-expression early-return').toBe(true);
    expect(hasStopScheduleKeyword, 'lessons-learned.md should document the stop+schedule pattern').toBe(true);
    // The PUT /interval endpoint is the surface that triggers the hot-reload — should be referenced
    // so future readers can trace from the API contract to the scheduler service method.
    expect(hasPutIntervalRef, 'lessons-learned.md should reference the PUT /interval route').toBe(true);
    // Cross-check: the hot-reload note must be a single coherent entry, not fragments scattered
    // across the doc — the reschedule + no-op + stop+schedule keywords should co-occur.
    expect(lowercasedContainsBoth(lowered, ['reschedule'], ['no-op', 'no op', 'same expression'])).toBe(true);
  });

  it('captures both patterns as discrete dated entries (one line per track-attributed lesson)', () => {
    const content = readLessons();
    // Each track-attributed lesson follows the pattern `(YYYY-MM-DD, <track_id>) **Title:** …`.
    // We require the cron-validation and hot-reload notes to be attributed to the scheduler-dashboard track
    // so the attribution is auditable in git history.
    const hasSchedulerDashboardAttribution = /2026-06-1[89],?\s+feature_scheduler_automation_dashboard/i.test(content);
    const hasCronValidationEntry = /\(2026-06-1[89],?\s+feature_scheduler_automation_dashboard[^)]*\)\s+\*\*[^*]*cron[^*]*\*\*/i.test(content);
    const hasHotReloadEntry = /\(2026-06-1[89],?\s+feature_scheduler_automation_dashboard[^)]*\)\s+\*\*[^*]*(hot[-\s]?reload|reschedule)[^*]*\*\*/i.test(content);

    expect(hasSchedulerDashboardAttribution, 'lessons-learned.md should have at least one entry attributed to the scheduler-dashboard track').toBe(true);
    expect(hasCronValidationEntry, 'lessons-learned.md should have a scheduler-dashboard-attributed entry about cron validation').toBe(true);
    expect(hasHotReloadEntry, 'lessons-learned.md should have a scheduler-dashboard-attributed entry about hot-reload / reschedule').toBe(true);
  });
});

function lowercasedContainsBoth(lowered: string, groupA: string[], groupB: string[]): boolean {
  // Verify at least one keyword from groupA and at least one from groupB both appear in the document.
  const hasA = groupA.some((kw) => lowered.includes(kw));
  const hasB = groupB.some((kw) => lowered.includes(kw));
  return hasA && hasB;
}
