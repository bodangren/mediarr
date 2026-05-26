import { describe, it, expect } from 'vitest';
import {
  playbackTargetSchema,
  playbackManifestRequestSchema,
  playbackProgressKeySchema,
} from './playback';

describe('playbackTargetSchema', () => {
  it('should validate a valid playback target', () => {
    const validTarget = {
      mediaType: 'MOVIE',
      mediaId: 123,
    };

    const result = playbackTargetSchema.parse(validTarget);
    expect(result).toEqual(validTarget);
  });

  it('should reject invalid mediaType', () => {
    const invalidTarget = {
      mediaType: 'invalid',
      mediaId: 123,
    };

    expect(() => playbackTargetSchema.parse(invalidTarget)).toThrow();
  });
});

describe('playbackManifestRequestSchema', () => {
  it('should validate a valid manifest request', () => {
    const validRequest = {
      mediaType: 'EPISODE',
      mediaId: 456,
      userId: 'user-1',
    };

    const result = playbackManifestRequestSchema.parse(validRequest);
    expect(result).toEqual(validRequest);
  });

  it('should validate without userId', () => {
    const validRequest = {
      mediaType: 'MOVIE',
      mediaId: 789,
    };

    const result = playbackManifestRequestSchema.parse(validRequest);
    expect(result.userId).toBeUndefined();
  });
});

describe('playbackProgressKeySchema', () => {
  it('should validate a valid progress key', () => {
    const validKey = {
      mediaType: 'EPISODE',
      mediaId: 101,
      userId: 'user-2',
    };

    const result = playbackProgressKeySchema.parse(validKey);
    expect(result).toEqual(validKey);
  });

  it('should reject missing userId', () => {
    const invalidKey = {
      mediaType: 'MOVIE',
      mediaId: 123,
    };

    expect(() => playbackProgressKeySchema.parse(invalidKey)).toThrow();
  });
});
