import { describe, it, expect } from 'vitest';
import { bulkUpdateResultSchema } from './bulk';

describe('bulkUpdateResultSchema', () => {
  it('should validate a valid bulk update result', () => {
    const validResult = {
      updated: 5,
      failed: 2,
      errors: [
        { movieId: 1, error: 'File not found' },
        { seriesId: 3, error: 'Permission denied' },
      ],
    };

    const result = bulkUpdateResultSchema.parse(validResult);
    expect(result).toEqual(validResult);
  });

  it('should validate a result without errors', () => {
    const validResult = {
      updated: 10,
      failed: 0,
    };

    const result = bulkUpdateResultSchema.parse(validResult);
    expect(result).toEqual(validResult);
  });

  it('should validate a result with empty errors array', () => {
    const validResult = {
      updated: 3,
      failed: 1,
      errors: [],
    };

    const result = bulkUpdateResultSchema.parse(validResult);
    expect(result).toEqual(validResult);
  });

  it('should reject a result missing required fields', () => {
    const invalidResult = {
      updated: 5,
      // missing 'failed'
    };

    expect(() => bulkUpdateResultSchema.parse(invalidResult)).toThrow();
  });

  it('should reject a result with wrong types', () => {
    const invalidResult = {
      updated: '5',
      failed: 2,
    };

    expect(() => bulkUpdateResultSchema.parse(invalidResult)).toThrow();
  });
});
