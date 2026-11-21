import { describe, expect, it } from 'vitest';
import { adultSeriesKey, adultTags } from './AdultSeriesTags';

describe('adultSeriesKey', () => {
  it('groups a dashed scene name under the leading brand segment', () => {
    // Real library titles look like "Blacked - My Scene Scene 2".
    expect(adultSeriesKey({ title: 'Blacked - My Scene Scene 2', studio: 'Blacked' })).toBe('Blacked');
    expect(adultSeriesKey({ title: 'Put It In Her Ass 36 Scene 2' })).toBe('Put It In Her Ass 36');
  });

  it('strips quality, dates, site names and bracketed tags', () => {
    expect(adultSeriesKey({
      title: '[OnlyFans] Collegefun04 Asian FSU Girl From The Threesome She Wanted A Sex Tape (2026)[720p][AV1]',
    })).toBe('Collegefun04 Asian FSU Girl From The Threesome She Wanted A Sex Tape');
  });

  it('removes sequel markers rather than treating each part as its own series', () => {
    expect(adultSeriesKey({ title: 'Anal Mastery Part 3' })).toBe('Anal Mastery');
    expect(adultSeriesKey({ title: 'Best Asian Babes Blowjobs Compilation Ep 4' }))
      .toBe('Best Asian Babes Blowjobs Compilation');
  });

  it('falls back to the file name when the row has no title', () => {
    expect(adultSeriesKey({ fileName: 'Lil Rae PMV 1080p.mp4' })).toBe('Lil Rae PMV');
  });

  it('refuses to invent a series for untitled, numeric or studio-only names', () => {
    expect(adultSeriesKey({ title: '002' })).toBeNull();
    expect(adultSeriesKey({ title: '', fileName: '', studio: 'Reality Kings' })).toBeNull();
    expect(adultSeriesKey({ title: 'Reality Kings', studio: 'Reality Kings' })).toBeNull();
  });
});

describe('adultTags', () => {
  it('derives studio, quality, year and state tags', () => {
    expect(adultTags({
      title: 'Anything',
      studio: 'Team Skeet',
      quality: '1080p',
      releaseDate: '2024-05-01',
      keep: true,
      isWatched: true,
    })).toEqual(['kept', 'quality:1080p', 'studio:team-skeet', 'watched', 'year:2024']);
  });

  it('finds quality in the file name when the column is empty', () => {
    expect(adultTags({ title: 'Some Scene', fileName: 'some.scene.2160p.mkv' }))
      .toContain('quality:2160p');
  });

  it('marks review items and unwatched items', () => {
    const tags = adultTags({ title: 'x', needsReview: true });
    expect(tags).toContain('review');
    expect(tags).toContain('unwatched');
    expect(tags).not.toContain('watched');
  });
});
