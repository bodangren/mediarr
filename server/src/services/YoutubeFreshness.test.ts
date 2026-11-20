import { describe, expect, it } from 'vitest';
import { ageLabel, countNew, isNew, sortByPublishedDesc } from './YoutubeFreshness';

/**
 * The owner asked for "today's or most recent podcasts" (2026-11-20). These are the
 * rules the TV cards and the Latest row are built on.
 */
describe('YoutubeFreshness', () => {
  const now = new Date('2026-11-20T21:00:00+08:00');
  const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 60 * 60 * 1000);
  const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  it('sorts newest first and pushes undated archive rows last', () => {
    const rows = [
      { id: 'archive', publishedAt: null },
      { id: 'week', publishedAt: daysAgo(6) },
      { id: 'today', publishedAt: hoursAgo(2) },
      { id: 'yesterday', publishedAt: daysAgo(1) },
    ];
    expect(sortByPublishedDesc(rows).map((row) => row.id)).toEqual(['today', 'yesterday', 'week', 'archive']);
  });

  it('marks only the last 24 hours as new', () => {
    expect(isNew(hoursAgo(2), now)).toBe(true);
    expect(isNew(hoursAgo(23), now)).toBe(true);
    expect(isNew(daysAgo(1.5), now)).toBe(false);
    expect(isNew(null, now)).toBe(false);
  });

  it('labels ages the way a 10-foot card needs', () => {
    expect(ageLabel(hoursAgo(1), now)).toBe('today');
    expect(ageLabel(hoursAgo(30), now)).toBe('yesterday');
    expect(ageLabel(daysAgo(3), now)).toBe('3d');
    expect(ageLabel(daysAgo(10), now)).toBe('1w');
    expect(ageLabel(daysAgo(45), now)).toBe('1mo');
    expect(ageLabel(daysAgo(500), now)).toBe('1y');
    expect(ageLabel(null, now)).toBe('archive');
  });

  it('counts the new window for the Today header', () => {
    const rows = [
      { publishedAt: hoursAgo(1) },
      { publishedAt: hoursAgo(5) },
      { publishedAt: daysAgo(2) },
      { publishedAt: null },
    ];
    expect(countNew(rows, now)).toBe(2);
  });
});
