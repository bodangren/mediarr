import { describe, it, expect } from 'vitest';
import { CategoryFilter } from '../server/src/indexers/CategoryFilter';
import { STANDARD_CATEGORIES } from '../server/src/seeds/categories';

describe('CategoryFilter', () => {
  const filter = new CategoryFilter(STANDARD_CATEGORIES);

  describe('mapToStandard', () => {
    it('should map a known indexer category ID to standard Newznab ID', () => {
      const mappings = [
        { id: '1', cat: 'Movies', desc: 'Movies' },
        { id: '2', cat: 'TV', desc: 'TV Shows' },
      ];

      const result = filter.mapToStandard('1', mappings);
      expect(result).toBe(2000); // Movies = 2000
    });

    it('should map subcategory names to correct IDs', () => {
      const mappings = [
        { id: '10', cat: 'Movies/HD', desc: 'HD Movies' },
      ];

      const result = filter.mapToStandard('10', mappings);
      expect(result).toBe(2040); // Movies/HD = 2040
    });

    it('should return null for unmapped category', () => {
      const mappings = [
        { id: '99', cat: 'Unknown/Category', desc: 'Unknown' },
      ];

      const result = filter.mapToStandard('99', mappings);
      expect(result).toBeNull();
    });
  });

  describe('filterByCategories', () => {
    const results = [
      { title: 'Movie A', categories: [2000] },
      { title: 'TV Show B', categories: [5000] },
      { title: 'Music C', categories: [3000] },
      { title: 'Movie D', categories: [2040] },
    ];

    it('should filter results to only include specified categories', () => {
      const filtered = filter.filterByCategories(results, [2000]);
      expect(filtered).toHaveLength(2); // Movie A (2000) and Movie D (2040 is child of 2000)
    });

    it('should include subcategories when filtering by parent', () => {
      const filtered = filter.filterByCategories(results, [2000]);
      const titles = filtered.map(r => r.title);
      expect(titles).toContain('Movie A');
      expect(titles).toContain('Movie D');
    });

    it('should return all results when no filter specified', () => {
      const filtered = filter.filterByCategories(results, []);
      expect(filtered).toHaveLength(4);
    });

    it('should filter by exact subcategory', () => {
      const filtered = filter.filterByCategories(results, [5000]);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].title).toBe('TV Show B');
    });
  });

  describe('resolveStandardName', () => {
    it('should resolve standard category ID to name', () => {
      expect(filter.resolveStandardName(2000)).toBe('Movies');
      expect(filter.resolveStandardName(5040)).toBe('TV/HD');
    });

    it('should return null for unknown ID', () => {
      expect(filter.resolveStandardName(9999)).toBeNull();
    });
  });
});
