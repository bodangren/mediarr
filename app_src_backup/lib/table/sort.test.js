import { describe, expect, it } from 'vitest';
import { createSortComparator, createStringSorter, nextSortState, } from './sort';
describe('table sort utilities', () => {
    it('computes next sort state like a reducer', () => {
        const current = { key: 'title', direction: 'asc' };
        expect(nextSortState(current, 'title')).toEqual({ key: 'title', direction: 'desc' });
        expect(nextSortState(current, 'year')).toEqual({ key: 'year', direction: 'asc' });
    });
    it('sorts by configured comparator for numbers and strings', () => {
        const rows = [
            { title: 'Beta', year: 2022, createdAt: '2026-02-14T10:00:00Z' },
            { title: 'Alpha', year: 2024, createdAt: '2026-02-13T10:00:00Z' },
            { title: 'Gamma', year: 2020, createdAt: '2026-02-12T10:00:00Z' },
        ];
        const titleComparator = createSortComparator({ key: 'title', direction: 'asc' }, { title: createStringSorter(row => row.title) });
        const yearComparator = createSortComparator({ key: 'year', direction: 'desc' }, { year: row => row.year });
        expect([...rows].sort(titleComparator).map(row => row.title)).toEqual(['Alpha', 'Beta', 'Gamma']);
        expect([...rows].sort(yearComparator).map(row => row.year)).toEqual([2024, 2022, 2020]);
    });
    it('supports multi-column fallback comparators', () => {
        const rows = [
            { title: 'Alpha', year: 2023, createdAt: '2026-02-14T10:00:00Z' },
            { title: 'Alpha', year: 2021, createdAt: '2026-02-13T10:00:00Z' },
            { title: 'Alpha', year: 2024, createdAt: '2026-02-12T10:00:00Z' },
        ];
        const comparator = createSortComparator({ key: 'title', direction: 'asc' }, { title: createStringSorter(row => row.title) }, [{ key: 'year', direction: 'asc', getter: row => row.year }]);
        expect([...rows].sort(comparator).map(row => row.year)).toEqual([2021, 2023, 2024]);
    });
});
//# sourceMappingURL=sort.test.js.map