import { describe, expect, it } from 'vitest';
import { transcodeProfile } from './YoutubeDownloadService';

describe('transcodeProfile', () => {
  it('keeps the high-quality profile for short videos', () => {
    const profile = transcodeProfile(8 * 60);
    expect(profile).toMatchObject({ preset: 'veryfast', crf: '21', scaleFilter: null });
    expect(profile.timeoutMs).toBeGreaterThanOrEqual(30 * 60 * 1000);
  });

  it('uses ultrafast for 15-45 minute videos at full resolution', () => {
    const profile = transcodeProfile(20 * 60);
    expect(profile).toMatchObject({ preset: 'ultrafast', crf: '23', scaleFilter: null });
  });

  it('downshifts long courses to ultrafast 720p with a proportional timeout', () => {
    const profile = transcodeProfile(3 * 60 * 60);
    expect(profile).toMatchObject({ preset: 'ultrafast', crf: '24', scaleFilter: 'scale=-2:720' });
    // 3 h at 1.5x encode speed needs ~2 h; the timeout must exceed that but stay bounded.
    expect(profile.timeoutMs).toBeGreaterThan(2 * 60 * 60 * 1000);
    expect(profile.timeoutMs).toBeLessThanOrEqual(6 * 60 * 60 * 1000);
  });

  it('treats unknown duration as a normal-length video', () => {
    expect(transcodeProfile(null).preset).toBe('veryfast');
  });
});
