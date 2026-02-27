import { describe, expect, it } from 'vitest';
import { testResultSchema } from './shared-schemas';

describe('shared-schemas', () => {
  describe('testResultSchema', () => {
    it('should parse a valid success payload', () => {
      const payload = {
        success: true,
        message: 'Connection successful',
        diagnostics: {
          remediationHints: [],
        },
      };

      const result = testResultSchema.parse(payload);

      expect(result).toEqual(payload);
    });

    it('should parse a valid failure payload with diagnostics', () => {
      const payload = {
        success: false,
        message: 'Connection failed',
        diagnostics: {
          remediationHints: ['Check host and port', 'Verify credentials'],
        },
      };

      const result = testResultSchema.parse(payload);

      expect(result).toEqual(payload);
    });

    it('should parse a payload with optional fields omitted', () => {
      const payload = {
        success: true,
        message: 'Test passed',
      };

      const result = testResultSchema.parse(payload);

      expect(result).toEqual(payload);
    });

    it('should fail validation for invalid payload (missing success)', () => {
      const payload = {
        message: 'Test result',
      };

      expect(() => testResultSchema.parse(payload)).toThrow();
    });
  });
});
