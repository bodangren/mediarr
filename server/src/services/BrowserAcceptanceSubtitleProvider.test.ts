import { describe, expect, it } from 'vitest';
import { BrowserAcceptanceSubtitleProvider } from './BrowserAcceptanceSubtitleProvider';

describe('BrowserAcceptanceSubtitleProvider', () => {
  const provider = new BrowserAcceptanceSubtitleProvider();

  it('returns a deterministic Thai candidate only for the browser movie fixture', async () => {
    await expect(provider.search({
      variant: { id: 1, path: '/tmp/Browser Acceptance Movie (2026)/movie.mp4' },
      audioTracks: [],
    })).resolves.toEqual([expect.objectContaining({
      languageCode: 'th',
      provider: 'browser-acceptance',
      extension: '.srt',
    })]);
    await expect(provider.search({
      variant: { id: 2, path: '/tmp/Other Movie/movie.mp4' },
      audioTracks: [],
    })).resolves.toEqual([]);
  });

  it('returns real subtitle content for the existing inventory write path', async () => {
    const [candidate] = await provider.search({
      variant: { id: 1, path: '/tmp/Browser Acceptance Movie (2026)/movie.mp4' },
      audioTracks: [],
    });

    const downloaded = await provider.download(candidate!);
    expect(downloaded.content?.toString()).toContain('Browser acceptance Thai subtitle');
  });
});
