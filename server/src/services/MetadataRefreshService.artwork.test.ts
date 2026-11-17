import { describe, expect, it } from 'vitest';
import { isPortraitPoster, pickPosterUrl } from './MetadataRefreshService';

/**
 * Owner report 2026-11-16/17: series tiles showed landscape title logos in
 * portrait frames. TVDB serves both a portrait poster (`/banners/posters/`) and
 * a wide title card (`/banners/graphical/`, `/banners/text/`), and import used
 * to take `images[0]` — so 23 series ended up with a logo in the poster column.
 */
describe('isPortraitPoster', () => {
  it('accepts TVDB portrait posters', () => {
    expect(isPortraitPoster('https://artworks.thetvdb.com/banners/posters/73141-10.jpg')).toBe(true);
  });

  it('accepts TMDB posters', () => {
    expect(isPortraitPoster('https://image.tmdb.org/t/p/w500/abc123.jpg')).toBe(true);
  });

  it('rejects the wide graphical title card', () => {
    expect(isPortraitPoster('https://artworks.thetvdb.com/banners/graphical/73141-g7.jpg')).toBe(
      false,
    );
  });

  it('rejects text-only title cards, clearlogos and fanart', () => {
    expect(isPortraitPoster('https://artworks.thetvdb.com/banners/text/95011.jpg')).toBe(false);
    expect(isPortraitPoster('https://artworks.thetvdb.com/banners/series/1/clearlogo.png')).toBe(
      false,
    );
    expect(
      isPortraitPoster('https://artworks.thetvdb.com/banners/fanart/original/73141-1.jpg'),
    ).toBe(false);
  });

  it('treats null/empty as not a poster', () => {
    expect(isPortraitPoster(null)).toBe(false);
    expect(isPortraitPoster('')).toBe(false);
  });
});

describe('pickPosterUrl', () => {
  it('prefers the Poster cover type over images[0]', () => {
    expect(
      pickPosterUrl([
        { coverType: 'Banner', url: 'https://x/banners/graphical/1-g2.jpg' },
        { coverType: 'Poster', url: 'https://x/banners/posters/1-1.jpg' },
        { coverType: 'Fanart', url: 'https://x/banners/fanart/original/1-1.jpg' },
      ]),
    ).toBe('https://x/banners/posters/1-1.jpg');
  });

  it('falls back to any portrait image when no Poster type is present', () => {
    expect(
      pickPosterUrl([
        { coverType: 'Banner', url: 'https://x/banners/graphical/1-g2.jpg' },
        { coverType: 'Other', url: 'https://image.tmdb.org/t/p/w500/1.jpg' },
      ]),
    ).toBe('https://image.tmdb.org/t/p/w500/1.jpg');
  });

  it('returns undefined when only landscape artwork exists', () => {
    expect(
      pickPosterUrl([{ coverType: 'Banner', url: 'https://x/banners/graphical/1-g2.jpg' }]),
    ).toBeUndefined();
    expect(pickPosterUrl([])).toBeUndefined();
    expect(pickPosterUrl(null)).toBeUndefined();
  });
});
