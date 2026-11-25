import { describe, expect, it } from 'vitest';
import { downloadFailureRetryAt, retryDelayMs } from './YoutubeAutomation';

const MIN = 60 * 1000;
const NOW = 1_700_000_000_000;

describe('downloadFailureRetryAt', () => {
  it('retries a missing-format failure within the hour whatever the attempt count', () => {
    const message = 'Command failed: yt-dlp ...\nERROR: [youtube] abc: Requested format is not available';
    for (const attempts of [1, 2, 3, 27]) {
      expect(downloadFailureRetryAt(message, attempts, NOW).getTime()).toBe(NOW + 30 * MIN);
    }
  });

  it('keeps the backoff ladder for every other failure', () => {
    expect(downloadFailureRetryAt('Read timed out', 1, NOW).getTime()).toBe(NOW + retryDelayMs(1));
    expect(downloadFailureRetryAt('Read timed out', 2, NOW).getTime()).toBe(NOW + 6 * 60 * MIN);
    expect(downloadFailureRetryAt('Read timed out', 4, NOW).getTime()).toBe(NOW + 7 * 24 * 60 * MIN);
  });
});
