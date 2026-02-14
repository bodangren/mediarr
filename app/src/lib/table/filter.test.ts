import { describe, expect, it } from 'vitest';
import {
  applyFilterGroup,
  containsFilter,
  equalsFilter,
  greaterThanFilter,
  type FilterGroup,
  type FilterPredicate,
} from './filter';

interface Row {
  title: string;
  year: number;
  protocol: 'torrent' | 'usenet';
}

describe('table filter predicates', () => {
  const rows: Row[] = [
    { title: 'Alpha Release', year: 2023, protocol: 'torrent' },
    { title: 'Beta Usenet', year: 2020, protocol: 'usenet' },
    { title: 'Gamma Torrent', year: 2025, protocol: 'torrent' },
  ];

  it('supports basic contains and equals predicates', () => {
    const predicates: FilterPredicate<Row>[] = [containsFilter<Row>('title', 'alpha'), equalsFilter<Row>('protocol', 'torrent')];

    const filtered = rows.filter(row => predicates.every(predicate => predicate(row)));
    expect(filtered).toEqual([{ title: 'Alpha Release', year: 2023, protocol: 'torrent' }]);
  });

  it('applies AND/OR filter groups', () => {
    const andGroup: FilterGroup<Row> = {
      operator: 'and',
      predicates: [equalsFilter<Row>('protocol', 'torrent'), greaterThanFilter<Row>('year', 2022)],
    };

    const orGroup: FilterGroup<Row> = {
      operator: 'or',
      predicates: [containsFilter<Row>('title', 'beta'), greaterThanFilter<Row>('year', 2024)],
    };

    expect(applyFilterGroup(rows, andGroup).map(row => row.title)).toEqual(['Alpha Release', 'Gamma Torrent']);
    expect(applyFilterGroup(rows, orGroup).map(row => row.title)).toEqual(['Beta Usenet', 'Gamma Torrent']);
  });
});
