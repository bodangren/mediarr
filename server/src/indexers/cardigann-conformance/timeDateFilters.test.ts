import { describe, expect, it } from 'vitest';
import { applyCardigannFilter } from '../CardigannFilterRuntime';

describe('Cardigann Time/Date and Value-Shaping Filters', () => {
  const now = new Date('2026-02-24T12:00:00Z');

  describe('timeago / fuzzytime', () => {
    it('handles "yesterday"', () => {
      const result = applyCardigannFilter('yesterday', { name: 'timeago' }, { now });
      expect(result).toBe('2026-02-23T12:00:00.000Z');
    });

    it('handles "today"', () => {
      const result = applyCardigannFilter('today', { name: 'timeago' }, { now });
      expect(result).toBe('2026-02-24T12:00:00.000Z');
    });

    it('handles minutes ago', () => {
      const result = applyCardigannFilter('10 minutes ago', { name: 'timeago' }, { now });
      expect(result).toBe('2026-02-24T11:50:00.000Z');
    });

    it('handles hours ago', () => {
      const result = applyCardigannFilter('2 hours ago', { name: 'timeago' }, { now });
      expect(result).toBe('2026-02-24T10:00:00.000Z');
    });

    it('handles days ago', () => {
      const result = applyCardigannFilter('5 days ago', { name: 'timeago' }, { now });
      expect(result).toBe('2026-02-19T12:00:00.000Z');
    });

    it('handles abbreviations (min, mins)', () => {
      expect(applyCardigannFilter('1 min ago', { name: 'timeago' }, { now })).toBe('2026-02-24T11:59:00.000Z');
      expect(applyCardigannFilter('5 mins ago', { name: 'timeago' }, { now })).toBe('2026-02-24T11:55:00.000Z');
    });

    it('is case-insensitive for relative dates', () => {
      const result = applyCardigannFilter('2 HOURS AGO', { name: 'timeago' }, { now });
      expect(result).toBe('2026-02-24T10:00:00.000Z');
    });
  });

  describe('dateparse', () => {
    it('parses standard date strings', () => {
      const result = applyCardigannFilter('2024-01-01 10:00:00', { name: 'dateparse' });
      // Depending on local timezone, this might vary if not specified, but ISO is expected
      expect(new Date(result).toISOString()).toBe(new Date('2024-01-01 10:00:00').toISOString());
    });

    it('handles localized month names (common in Cardigann)', () => {
       // This might fail if the runtime doesn't support it yet
       const result = applyCardigannFilter('Jan 24, 2026', { name: 'dateparse' });
       expect(new Date(result).getUTCFullYear()).toBe(2026);
    });

    it('handles dd.MM.yyyy format', () => {
      const result = applyCardigannFilter('24.02.2026', { name: 'dateparse' });
      expect(new Date(result).toISOString()).toBe('2026-02-24T00:00:00.000Z');
    });
  });

  describe('remove', () => {
    it('removes literal strings', () => {
      const result = applyCardigannFilter('1,234.56 MB', { name: 'remove', args: [','] });
      expect(result).toBe('1234.56 MB');
    });

    it('removes multiple occurrences', () => {
      const result = applyCardigannFilter('a-b-c', { name: 'remove', args: ['-'] });
      expect(result).toBe('abc');
    });
  });

  describe('case', () => {
    it('maps values using a case object', () => {
      // Cardigann 'case' filter usually takes an object/map of values
      const result = applyCardigannFilter('1', { name: 'case', args: [{ '1': 'Movie', '2': 'TV' }] });
      expect(result).toBe('Movie');
    });

    it('returns original value if no match in case map', () => {
      const result = applyCardigannFilter('3', { name: 'case', args: [{ '1': 'Movie', '2': 'TV' }] });
      expect(result).toBe('3');
    });
  });
});
