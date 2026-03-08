import { describe, it, expect } from 'vitest';
import { parseLibraryFilters, applyLibraryFilters } from './queryHelpers';

describe('parseLibraryFilters', () => {
  it('parses monitored boolean string', () => {
    expect(parseLibraryFilters({ monitored: 'true' })).toEqual({
      monitored: true,
      status: undefined,
      search: undefined,
    });
  });

  it('parses status string', () => {
    expect(parseLibraryFilters({ status: 'Ended' })).toEqual({
      monitored: undefined,
      status: 'ended',
      search: undefined,
    });
  });

  it('parses search string', () => {
    expect(parseLibraryFilters({ search: 'Breaking' })).toEqual({
      monitored: undefined,
      status: undefined,
      search: 'breaking',
    });
  });

  it('ignores empty strings', () => {
    expect(parseLibraryFilters({ status: '', search: '  ' })).toEqual({
      monitored: undefined,
      status: undefined,
      search: undefined,
    });
  });
});

describe('applyLibraryFilters', () => {
  const items = [
    { title: 'Breaking Bad', monitored: true, status: 'ended' },
    { title: 'The Wire', monitored: false, status: 'ended' },
    { title: 'Stranger Things', monitored: true, status: 'continuing' },
  ];

  it('filters by monitored', () => {
    const result = applyLibraryFilters(items, { monitored: true });
    expect(result).toHaveLength(2);
    expect(result.every(i => i.monitored)).toBe(true);
  });

  it('filters by status', () => {
    const result = applyLibraryFilters(items, { status: 'ended' });
    expect(result).toHaveLength(2);
  });

  it('filters by search', () => {
    const result = applyLibraryFilters(items, { search: 'break' });
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Breaking Bad');
  });

  it('combines filters', () => {
    const result = applyLibraryFilters(items, { monitored: true, status: 'continuing' });
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Stranger Things');
  });
});
