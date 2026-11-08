import { describe, expect, it } from 'vitest';
import { generateMissingAdultThumbnails } from './AdultThumbnailService';

describe('generateMissingAdultThumbnails', () => {
  it('generates only missing thumbnails, bounded by the limit', async () => {
    const generated: number[] = [];
    const result = await generateMissingAdultThumbnails({
      rows: [
        { id: 1, path: '/a.mp4' },
        { id: 2, path: '/b.mp4' },
        { id: 3, path: '/c.mp4' },
      ],
      thumbnails: {
        hasThumbnail: async (id) => id === 2,
        generate: async (id) => { generated.push(id); return `/t/${id}.jpg`; },
      },
      limit: 1,
      sleep: async () => undefined,
    });
    expect(generated).toEqual([1]);
    expect(result).toMatchObject({ generated: 1, failures: [], scanned: 3 });
  });

  it('records failures without aborting the pass', async () => {
    const result = await generateMissingAdultThumbnails({
      rows: [{ id: 1, path: '/a.mp4' }, { id: 2, path: '/b.mp4' }],
      thumbnails: {
        hasThumbnail: async () => false,
        generate: async (id) => { if (id === 1) throw new Error('ffmpeg boom'); return '/ok.jpg'; },
      },
      sleep: async () => undefined,
    });
    expect(result.generated).toBe(1);
    expect(result.failures[0]).toMatchObject({ id: 1, error: 'ffmpeg boom' });
  });
});
