import { describe, expect, it } from 'vitest';
import { adultSeriesKey, adultTags, topFolderOf } from './AdultSeriesTags';

describe('adultSeriesKey with folders', () => {
  it('shelves by the top-level folder: all BFFs scenes are one shelf', () => {
    // Owner report 2026-11-21: the year-tagged rows were all BFFs, visible from the folder.
    expect(adultSeriesKey({
      title: 'Dani Damzel Dakota Burns And Natalia Nix',
      fileName: 'BFFS.21.01.26.Dani.Damzel.mkv',
      folder: 'BFFs',
    })).toBe('BFFs');
    expect(adultSeriesKey({ title: 'Sahily Sweet Anastasia', folder: 'BFFs' })).toBe('BFFs');
    expect(adultSeriesKey({ title: 'Mina Tran Analed Asian', folder: 'Holed' })).toBe('Holed');
    expect(adultSeriesKey({ title: 'Satine Summers Tight Hole', folder: 'Little Asians' })).toBe('Little Asians');
  });

  it('cleans year and dotted noise out of a folder name', () => {
    expect(adultSeriesKey({ title: 'x', folder: 'Asian Anal [2021]' })).toBe('Asian Anal');
    expect(adultSeriesKey({ title: 'x', folder: 'Asian.Schoolgirls.Vol.3.[New.Sensations.2022].XXX' }))
      .toBe('Asian Schoolgirls');
  });
});

describe('adultSeriesKey', () => {
  it('groups a dashed scene name under the leading brand segment', () => {
    expect(adultSeriesKey({ title: 'Blacked - My Scene Scene 2', studio: 'Blacked' })).toBe('Blacked');
    // 36 is the volume, so scenes 2 and 3 of that volume share one shelf.
    expect(adultSeriesKey({ title: 'Put It In Her Ass 36 Scene 2' })).toBe('Put It In Her Ass');
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

  it('groups volumes of one title on the same shelf', () => {
    expect(adultSeriesKey({ title: "Another Man's Wife 12" })).toBe("Another Man's Wife");
    expect(adultSeriesKey({ title: 'Bubble Butt Anal Slut 18' })).toBe('Bubble Butt Anal Slut');
    expect(adultSeriesKey({ title: 'The 100' })).toBe('The 100');
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

  it('falls back to the folder for the studio tag and adds filename keywords', () => {
    const tags = adultTags({
      title: 'Mina Tran Analed Asian',
      fileName: 'Holed.24.03.08.Mina.Tran.Analed.Asian.XXX.1080p.mp4',
      studio: null,
      folder: 'Holed',
    });
    expect(tags).toContain('studio:holed');
    expect(tags).toContain('anal');
    expect(tags).toContain('asian');
    expect(tags).toContain('quality:1080p');
  });

  it('tags what the filename says, including compilation and threesome', () => {
    const tags = adultTags({
      title: 'Best Asian Babes Blowjobs Compilation',
      fileName: 'Asian College Girls Threesome Compilation.mp4',
    });
    expect(tags).toEqual(expect.arrayContaining(['asian', 'blowjob', 'compilation', 'threesome']));
  });
});

describe('topFolderOf', () => {
  it('returns the first folder under the adult root', () => {
    expect(topFolderOf('/data/Porn/BFFs/scene.mp4', '/data/Porn')).toBe('BFFs');
    expect(topFolderOf('/data/Porn/Holed/2024/scene.mp4', '/data/Porn')).toBe('Holed');
  });

  it('returns null for files directly in the root or outside it', () => {
    expect(topFolderOf('/data/Porn/loose.mp4', '/data/Porn')).toBeNull();
    expect(topFolderOf('/data/Movies/x.mkv', '/data/Porn')).toBeNull();
  });
});
