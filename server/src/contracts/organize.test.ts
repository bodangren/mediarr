import { describe, it, expect } from 'vitest';
import { organizeResultSchema } from './organize';

describe('organizeResultSchema', () => {
  it('should validate a valid organize result with movie errors', () => {
    const validResult = {
      renamed: 5,
      failed: 2,
      errors: [
        { movieId: 1, error: 'File not found' },
        { movieId: 3, error: 'Permission denied' },
      ],
    };

    const result = organizeResultSchema.parse(validResult);
    expect(result).toEqual(validResult);
  });

  it('should validate a valid organize result with episode errors', () => {
    const validResult = {
      renamed: 10,
      failed: 1,
      errors: [
        { episodeId: 101, error: 'File locked' },
      ],
    };

    const result = organizeResultSchema.parse(validResult);
    expect(result).toEqual(validResult);
  });

  it('should validate a result with no errors', () => {
    const validResult = {
      renamed: 3,
      failed: 0,
      errors: [],
    };

    const result = organizeResultSchema.parse(validResult);
    expect(result.errors).toEqual([]);
  });

  it('should reject missing required fields', () => {
    const invalidResult = {
      renamed: 5,
      // missing failed
      errors: [],
    };

    expect(() => organizeResultSchema.parse(invalidResult)).toThrow();
  });

  it('should reject wrong types', () => {
    const invalidResult = {
      renamed: '5',
      failed: 2,
      errors: [],
    };

    expect(() => organizeResultSchema.parse(invalidResult)).toThrow();
  });
});
