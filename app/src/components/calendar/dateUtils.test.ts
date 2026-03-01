import { describe, expect, it } from 'vitest';
import { getCalendarFetchRange, toLocalDateKey } from './dateUtils';

describe('calendar date utils', () => {
  it('formats date keys from local date parts (not UTC string conversion)', () => {
    const fakeDate = {
      getFullYear: () => 2026,
      getMonth: () => 2,
      getDate: () => 1,
      toISOString: () => '2026-02-28T16:00:00.000Z',
    } as unknown as Date;

    expect(toLocalDateKey(fakeDate)).toBe('2026-03-01');
  });

  it('builds the calendar fetch range using local calendar boundaries', () => {
    expect(getCalendarFetchRange(2026, 2)).toEqual({
      start: '2026-03-01',
      end: '2026-04-04',
    });
  });
});
