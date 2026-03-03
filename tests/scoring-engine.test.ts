import { describe, it, expect } from 'vitest';
import { CustomFormatScoringEngine } from '../server/src/services/CustomFormatScoringEngine';
import type { SearchCandidate } from '../server/src/services/MediaSearchService';
import type { CustomFormatWithScores } from '../server/src/repositories/CustomFormatRepository';

describe('CustomFormatScoringEngine - Unified Scoring', () => {
  it('should calculate a unified score considering CustomFormats, Seeds, Indexer Priority, and Confidence', () => {
    const engine = new CustomFormatScoringEngine();

    const candidate: SearchCandidate & { resolution?: number } = {
      title: 'Breaking.Bad.S01E01.1080p.BluRay.x264-GRP',
      indexer: 'EliteTracker',
      indexerId: 1,
      guid: '123',
      size: 1000000000,
      seeders: 100,
      protocol: 'torrent',
      resolution: 1080,
    };

    const targetParams = {
      title: 'Breaking Bad',
      season: 1,
      episode: 1,
    };

    const indexerPriority = 10; // High priority indexer

    const formats: Array<{ customFormat: CustomFormatWithScores; score: number }> = [
      {
        score: 50,
        customFormat: {
          id: 1,
          name: '1080p',
          conditions: [
            {
              id: 1,
              customFormatId: 1,
              type: 'resolution',
              field: null,
              operator: 'equals',
              value: 1080,
              negate: false,
            },
          ],
        },
      },
    ];

    const result = engine.scoreCandidateUnified(
      candidate,
      formats,
      targetParams,
      indexerPriority
    );

    // Expected Logic:
    // Base Format Score: 50
    // Confidence Score: Perfect match (1.0) * 100 = 100
    // Indexer Bonus: Priority 10 * 5 (weight) = 50
    // Seeds Bonus: log10(100) * 10 (weight) = 20
    // Total = 50 + 100 + 50 + 20 = 220
    expect(result.totalScore).toBeGreaterThan(0);
    expect(result.breakdown.customFormatScore).toBe(50);
    expect(result.breakdown.confidenceScore).toBe(100);
    expect(result.breakdown.indexerScore).toBe(50);
    expect(result.breakdown.seedScore).toBe(20);
    expect(result.totalScore).toBe(220);
  });

  it('should penalize candidates with low confidence', () => {
    const engine = new CustomFormatScoringEngine();

    const candidate: SearchCandidate = {
      title: 'Better.Call.Saul.S01E01.1080p.WEB-DL',
      indexer: 'PublicTracker',
      indexerId: 2,
      guid: '124',
      size: 500000000,
      seeders: 10,
      protocol: 'torrent',
    };

    const targetParams = {
      title: 'Breaking Bad',
      season: 1,
      episode: 1,
    };

    const result = engine.scoreCandidateUnified(
      candidate,
      [],
      targetParams,
      1 // Low priority
    );

    // Completely wrong title should have 0 confidence.
    expect(result.breakdown.confidenceScore).toBeLessThan(50);
  });
});
