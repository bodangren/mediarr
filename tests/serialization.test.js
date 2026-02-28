import { describe, it, expect } from 'vitest';
import {
  deserializeBigIntFields,
  serializeApiPayload,
  serializeDate,
  normalizeEnumValue,
} from '../server/src/utils/serialization';

describe('serialization utilities', () => {
  it('should serialize bigint values into JSON-safe strings', () => {
    const payload = {
      id: BigInt('9007199254740993'),
      nested: {
        bytes: BigInt(42),
      },
    };

    const result = serializeApiPayload(payload);

    expect(result).toEqual({
      id: '9007199254740993',
      nested: {
        bytes: '42',
      },
    });
  });

  it('should deserialize configured string fields into bigint values', () => {
    const input = {
      infoHash: 'abc',
      size: '1000',
      downloaded: '512',
      untouched: 'noop',
    };

    const result = deserializeBigIntFields(input, ['size', 'downloaded']);

    expect(result.size).toBe(BigInt(1000));
    expect(result.downloaded).toBe(BigInt(512));
    expect(result.untouched).toBe('noop');
  });

  it('should serialize Date values as ISO strings', () => {
    const date = new Date('2026-02-11T08:30:00.000Z');
    expect(serializeDate(date)).toBe('2026-02-11T08:30:00.000Z');
  });

  it('should safely handle invalid Date values', () => {
    const invalidDate = new Date('invalid');
    expect(serializeDate(invalidDate)).toBeUndefined();

    const payload = serializeApiPayload({ publishDate: invalidDate });
    expect(JSON.stringify(payload)).toBe('{}');
  });

  it('should normalize enum values to string unions', () => {
    expect(normalizeEnumValue('DOWNLOADING')).toBe('DOWNLOADING');
  });

  it('should not require BigInt prototype mutation', () => {
    expect(Object.prototype.hasOwnProperty.call(BigInt.prototype, 'toJSON')).toBe(false);
  });
});
