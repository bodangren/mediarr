import { describe, expect, it } from 'vitest';
import { retryDelayMs } from './YoutubeAutomation';

describe('retryDelayMs', () => {
  it('backs off 30 min, 6 h, 24 h and caps at 24 h', () => {
    expect(retryDelayMs(1)).toBe(30 * 60 * 1000);
    expect(retryDelayMs(2)).toBe(6 * 60 * 60 * 1000);
    expect(retryDelayMs(3)).toBe(24 * 60 * 60 * 1000);
    expect(retryDelayMs(9)).toBe(24 * 60 * 60 * 1000);
  });
});
