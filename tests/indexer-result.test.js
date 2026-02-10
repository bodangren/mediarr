import { describe, it, expect } from 'vitest';
import { deduplicateResults, mergeResults } from '../server/src/indexers/IndexerResult';

describe('IndexerResult utilities', () => {
  const makeResult = (guid, title, indexerName) => ({
    title,
    guid,
    publishDate: new Date('2025-02-10'),
    categories: [2000],
    protocol: 'torrent',
    indexerName,
  });

  describe('deduplicateResults', () => {
    it('should remove duplicate results by guid', () => {
      const results = [
        makeResult('guid-1', 'Movie A', 'Indexer1'),
        makeResult('guid-2', 'Movie B', 'Indexer1'),
        makeResult('guid-1', 'Movie A (dup)', 'Indexer2'),
      ];

      const deduped = deduplicateResults(results);
      expect(deduped).toHaveLength(2);
      expect(deduped[0].title).toBe('Movie A');
      expect(deduped[1].title).toBe('Movie B');
    });

    it('should handle empty array', () => {
      expect(deduplicateResults([])).toHaveLength(0);
    });

    it('should keep all results when no duplicates', () => {
      const results = [
        makeResult('guid-1', 'A', 'I1'),
        makeResult('guid-2', 'B', 'I2'),
        makeResult('guid-3', 'C', 'I3'),
      ];
      expect(deduplicateResults(results)).toHaveLength(3);
    });
  });

  describe('mergeResults', () => {
    it('should merge results from multiple indexers', () => {
      const set1 = [
        makeResult('guid-1', 'Movie A', 'Indexer1'),
        makeResult('guid-2', 'Movie B', 'Indexer1'),
      ];
      const set2 = [
        makeResult('guid-3', 'Movie C', 'Indexer2'),
        makeResult('guid-4', 'Movie D', 'Indexer2'),
      ];

      const merged = mergeResults(set1, set2);
      expect(merged).toHaveLength(4);
    });

    it('should deduplicate across indexer result sets', () => {
      const set1 = [
        makeResult('guid-1', 'Movie A from I1', 'Indexer1'),
      ];
      const set2 = [
        makeResult('guid-1', 'Movie A from I2', 'Indexer2'),
        makeResult('guid-2', 'Movie B from I2', 'Indexer2'),
      ];

      const merged = mergeResults(set1, set2);
      expect(merged).toHaveLength(2);
      // First occurrence wins
      expect(merged[0].title).toBe('Movie A from I1');
    });

    it('should handle empty sets', () => {
      expect(mergeResults([], [])).toHaveLength(0);
    });

    it('should handle single set', () => {
      const set = [makeResult('guid-1', 'A', 'I1')];
      expect(mergeResults(set)).toHaveLength(1);
    });
  });
});
