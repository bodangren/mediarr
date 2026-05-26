import { describe, it, expect } from 'vitest';
import { subtitleUploadInputSchema } from './subtitle';

describe('subtitleUploadInputSchema', () => {
  it('should validate a valid subtitle upload input', () => {
    const validInput = {
      mediaId: 123,
      mediaType: 'movie',
      language: 'en',
      forced: false,
      hearingImpaired: true,
    };

    const result = subtitleUploadInputSchema.parse(validInput);
    expect(result).toEqual(validInput);
  });

  it('should validate episode mediaType', () => {
    const validInput = {
      mediaId: 456,
      mediaType: 'episode',
      language: 'fr',
      forced: true,
      hearingImpaired: false,
    };

    const result = subtitleUploadInputSchema.parse(validInput);
    expect(result.mediaType).toBe('episode');
  });

  it('should reject invalid mediaType', () => {
    const invalidInput = {
      mediaId: 123,
      mediaType: 'series',
      language: 'en',
      forced: false,
      hearingImpaired: false,
    };

    expect(() => subtitleUploadInputSchema.parse(invalidInput)).toThrow();
  });

  it('should reject missing required fields', () => {
    const invalidInput = {
      mediaId: 123,
      // missing mediaType
      language: 'en',
      forced: false,
      hearingImpaired: false,
    };

    expect(() => subtitleUploadInputSchema.parse(invalidInput)).toThrow();
  });

  it('should reject wrong types', () => {
    const invalidInput = {
      mediaId: '123',
      mediaType: 'movie',
      language: 'en',
      forced: false,
      hearingImpaired: false,
    };

    expect(() => subtitleUploadInputSchema.parse(invalidInput)).toThrow();
  });
});
