import { describe, expect, it } from 'vitest';
import { shouldRequeueLegacyBotFailure } from './YoutubeAutomation';

describe('shouldRequeueLegacyBotFailure', () => {
  it('requeues bot-check failures recorded without the cookie flag', () => {
    expect(shouldRequeueLegacyBotFailure(
      'Command failed: yt-dlp --no-playlist -f b --write-info-json https://youtube.com/watch?v=x\n'
      + 'ERROR: [youtube] x: Sign in to confirm you’re not a bot.',
    )).toBe(true);
  });

  it('keeps failures that already used --cookies-from-browser', () => {
    expect(shouldRequeueLegacyBotFailure(
      'Command failed: yt-dlp --cookies-from-browser chrome --no-playlist -f b\n'
      + 'ERROR: Sign in to confirm you’re not a bot.',
    )).toBe(false);
  });

  it('ignores other errors and empty errors', () => {
    expect(shouldRequeueLegacyBotFailure('transcode failed: ffmpeg exited 1')).toBe(false);
    expect(shouldRequeueLegacyBotFailure(null)).toBe(false);
  });
});
