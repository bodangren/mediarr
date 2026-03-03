import { describe, expect, it } from 'vitest';
import { applyFilterGroup, containsFilter, equalsFilter, greaterThanFilter, } from './filter';
describe('table filter predicates', () => {
    const rows = [
        { title: 'Alpha Release', year: 2023, protocol: 'torrent' },
        { title: 'Beta Usenet', year: 2020, protocol: 'usenet' },
        { title: 'Gamma Torrent', year: 2025, protocol: 'torrent' },
    ];
    it('supports basic contains and equals predicates', () => {
        const predicates = [containsFilter('title', 'alpha'), equalsFilter('protocol', 'torrent')];
        const filtered = rows.filter(row => predicates.every(predicate => predicate(row)));
        expect(filtered).toEqual([{ title: 'Alpha Release', year: 2023, protocol: 'torrent' }]);
    });
    it('applies AND/OR filter groups', () => {
        const andGroup = {
            operator: 'and',
            predicates: [equalsFilter('protocol', 'torrent'), greaterThanFilter('year', 2022)],
        };
        const orGroup = {
            operator: 'or',
            predicates: [containsFilter('title', 'beta'), greaterThanFilter('year', 2024)],
        };
        expect(applyFilterGroup(rows, andGroup).map(row => row.title)).toEqual(['Alpha Release', 'Gamma Torrent']);
        expect(applyFilterGroup(rows, orGroup).map(row => row.title)).toEqual(['Beta Usenet', 'Gamma Torrent']);
    });
});
//# sourceMappingURL=filter.test.js.map