import { describe, expect, it } from 'vitest';
import { canRemuxToTv } from './YoutubeDownloadService';

describe('canRemuxToTv', () => {
  it('copies H.264 video at TV-compatible size and frame rate', () => {
    expect(canRemuxToTv({ videoCodec: 'h264', height: 1080, fps: 30, audioCodec: 'opus' })).toBe(true);
    expect(canRemuxToTv({ videoCodec: 'h264', height: 720, fps: 25, audioCodec: 'opus' })).toBe(true);
  });

  it('transcodes VP9/AV1, 60 fps or larger-than-1080p video', () => {
    expect(canRemuxToTv({ videoCodec: 'vp9', height: 1080, fps: 30, audioCodec: 'opus' })).toBe(false);
    expect(canRemuxToTv({ videoCodec: 'h264', height: 1080, fps: 60, audioCodec: 'opus' })).toBe(false);
    expect(canRemuxToTv({ videoCodec: 'h264', height: 2160, fps: 30, audioCodec: 'opus' })).toBe(false);
  });

  it('falls back to transcoding when the probe failed', () => {
    expect(canRemuxToTv(null)).toBe(false);
  });
});
