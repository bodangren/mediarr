import { describe, expect, it } from 'vitest';
import { moveColumn, saveColumnPreferences, loadColumnPreferences, toggleColumnVisibility, } from './columns';
function createStorage(seed) {
    const map = new Map(Object.entries(seed ?? {}));
    return {
        getItem: key => map.get(key) ?? null,
        setItem: (key, value) => {
            map.set(key, value);
        },
    };
}
describe('column preference utilities', () => {
    const columns = [
        { key: 'title', label: 'Title', visible: true },
        { key: 'year', label: 'Year', visible: true },
        { key: 'status', label: 'Status', visible: true },
    ];
    it('toggles column visibility', () => {
        const next = toggleColumnVisibility(columns, 'year');
        expect(next.find(column => column.key === 'year')?.visible).toBe(false);
    });
    it('reorders columns', () => {
        const moved = moveColumn(columns, 0, 2);
        expect(moved.map(column => column.key)).toEqual(['year', 'status', 'title']);
    });
    it('returns original columns for invalid move ranges', () => {
        expect(moveColumn(columns, 2, 2)).toEqual(columns);
        expect(moveColumn(columns, -1, 1)).toEqual(columns);
        expect(moveColumn(columns, 1, 9)).toEqual(columns);
    });
    it('persists and loads column preferences', () => {
        const storage = createStorage();
        saveColumnPreferences('indexers', columns, storage);
        expect(loadColumnPreferences('indexers', storage)).toEqual(columns);
    });
    it('handles missing storage and invalid stored payloads', () => {
        expect(loadColumnPreferences('indexers')).toBeNull();
        expect(loadColumnPreferences('indexers', createStorage())).toBeNull();
        const badStorage = createStorage({
            'mediarr.table.columns.indexers': '{broken',
        });
        expect(loadColumnPreferences('indexers', badStorage)).toBeNull();
        expect(() => saveColumnPreferences('indexers', columns)).not.toThrow();
    });
});
//# sourceMappingURL=columns.test.js.map