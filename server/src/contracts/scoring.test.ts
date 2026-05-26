import { describe, it, expect } from 'vitest';
import { scoringBreakdownSchema } from './scoring';

describe('scoringBreakdownSchema', () => {
  it('should validate a valid scoring breakdown', () => {
    const validBreakdown = {
      customFormats: [
        { id: 1, name: 'HDR', score: 10 },
        { id: 2, name: 'Atmos', score: 5 },
      ],
      customFormatScore: 15,
      confidenceScore: 85,
      indexerPriority: 10,
      indexerScore: 90,
      seeders: 100,
      seedScore: 80,
      totalScore: 270,
    };

    const result = scoringBreakdownSchema.parse(validBreakdown);
    expect(result).toEqual(validBreakdown);
  });

  it('should validate with empty customFormats', () => {
    const validBreakdown = {
      customFormats: [],
      customFormatScore: 0,
      confidenceScore: 70,
      indexerPriority: 5,
      indexerScore: 75,
      seeders: 50,
      seedScore: 60,
      totalScore: 210,
    };

    const result = scoringBreakdownSchema.parse(validBreakdown);
    expect(result.customFormats).toEqual([]);
  });

  it('should reject missing required fields', () => {
    const invalidBreakdown = {
      customFormats: [],
      customFormatScore: 0,
      // missing confidenceScore
      indexerPriority: 5,
      indexerScore: 75,
      seeders: 50,
      seedScore: 60,
      totalScore: 210,
    };

    expect(() => scoringBreakdownSchema.parse(invalidBreakdown)).toThrow();
  });

  it('should reject wrong types', () => {
    const invalidBreakdown = {
      customFormats: 'not-an-array',
      customFormatScore: 0,
      confidenceScore: 70,
      indexerPriority: 5,
      indexerScore: 75,
      seeders: 50,
      seedScore: 60,
      totalScore: 210,
    };

    expect(() => scoringBreakdownSchema.parse(invalidBreakdown)).toThrow();
  });

  it('should reject invalid customFormat item', () => {
    const invalidBreakdown = {
      customFormats: [
        { id: 'not-a-number', name: 'HDR', score: 10 },
      ],
      customFormatScore: 10,
      confidenceScore: 70,
      indexerPriority: 5,
      indexerScore: 75,
      seeders: 50,
      seedScore: 60,
      totalScore: 210,
    };

    expect(() => scoringBreakdownSchema.parse(invalidBreakdown)).toThrow();
  });
});
