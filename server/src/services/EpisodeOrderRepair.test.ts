import { describe, expect, it } from 'vitest';
import {
  canonicalTitleFromFileName,
  metadataForRow,
  planEpisodeReorder,
  type ReorderRow,
} from './EpisodeOrderRepair';

/**
 * Owner report 2026-11-17: Firefly's files are in canonical (production) order
 * starting with the pilot, but the titles/synopses were indexed in original
 * broadcast order starting with "The Train Job". These tests pin the real
 * library state so the repair is provably correct before anything is written.
 */
const fireflyRows: ReorderRow[] = [
  // The real library state: broadcast-order metadata on canonical-order files.
  { id: 283, episodeNumber: 1, title: 'The Train Job', overview: 'train robbery', airDateUtc: 1032480000, filePath: '/tv/Firefly/Season 1/Firefly.S01E01.Serenity.1080p.BRRip.AC3.x264-LESS.mkv' },
  { id: 286, episodeNumber: 2, title: 'Bushwhacked', overview: 'derelict ship', airDateUtc: 1033084800, filePath: '/tv/Firefly/Season 1/Firefly.S01E02.The.Train.Job.1080p.BRRip.AC3.x264-LESS.mkv' },
  { id: 289, episodeNumber: 3, title: 'Our Mrs. Reynolds', overview: 'unwitting marriage', airDateUtc: 1033689600, filePath: '/tv/Firefly/Season 1/Firefly.S01E03.Bushwhacked.1080p.BRRip.AC3.x264-LESS.mkv' },
  { id: 293, episodeNumber: 4, title: 'Jaynestown', overview: 'folk hero', airDateUtc: 1034294400, filePath: '/tv/Firefly/Season 1/Firefly.S01E04.Shindig.1080p.BRRip.AC3.x264-LESS.mkv' },
  { id: 297, episodeNumber: 5, title: 'Out of Gas', overview: 'life support fails', airDateUtc: 1034899200, filePath: '/tv/Firefly/Season 1/Firefly.S01E05.Safe.1080p.BRRip.AC3.x264-LESS.mkv' },
  { id: 300, episodeNumber: 6, title: 'Shindig', overview: 'ballroom duel', airDateUtc: 1035504000, filePath: '/tv/Firefly/Season 1/Firefly.S01E06.Our.Mrs.Reynolds.1080p.BRRip.AC3.x264-LESS.mkv' },
  { id: 313, episodeNumber: 7, title: 'Safe', overview: 'kidnapped doctor', airDateUtc: 1036108800, filePath: '/tv/Firefly/Season 1/Firefly.S01E07.Jaynestown.1080p.BRRip.AC3.x264-LESS.mkv' },
  { id: 316, episodeNumber: 8, title: 'Ariel', overview: 'hospital heist', airDateUtc: 1036713600, filePath: '/tv/Firefly/Season 1/Firefly.S01E08.Out.of.Gas.1080p.BRRip.AC3.x264-LESS.mkv' },
  { id: 323, episodeNumber: 9, title: 'War Stories', overview: 'tortured captain', airDateUtc: 1039123200, filePath: '/tv/Firefly/Season 1/Firefly.S01E09.Ariel.1080p.BRRip.AC3.x264-LESS.mkv' },
  { id: 329, episodeNumber: 10, title: 'Objects in Space', overview: 'bounty hunter', airDateUtc: 1039728000, filePath: '/tv/Firefly/Season 1/Firefly.S01E10.War.Stories.1080p.BRRip.AC3.x264-LESS.mkv' },
  { id: 333, episodeNumber: 11, title: 'Serenity', overview: 'In desperate times, the crew of Serenity takes a job.', airDateUtc: 1040342400, filePath: '/tv/Firefly/Season 1/Firefly.S01E11.Trash.1080p.BRRip.AC3.x264-LESS.mkv' },
  { id: 335, episodeNumber: 12, title: 'Heart of Gold', overview: 'Deadwood moon', airDateUtc: 1056326400, filePath: '/tv/Firefly/Season 1/Firefly.S01E12.The.Message.1080p.BRRip.AC3.x264-LESS.mkv' },
  { id: 437, episodeNumber: 13, title: 'Trash', overview: 'tough choice', airDateUtc: 1056326400, filePath: '/tv/Firefly/Season 1/Firefly.S01E13.Heart.of.Gold.1080p.BRRip.AC3.x264-LESS.mkv' },
  { id: 442, episodeNumber: 14, title: 'The Message', overview: 'a nice day at a spaceport', airDateUtc: 1056326400, filePath: '/tv/Firefly/Season 1/Firefly.S01E14.Objects.in.Space.1080p.BRRip.AC3.x264-LESS.mkv' },
];

describe('canonicalTitleFromFileName', () => {
  it('reads the title after the episode marker', () => {
    expect(
      canonicalTitleFromFileName(
        '/tv/Firefly/Season 1/Firefly.S01E02.The.Train.Job.1080p.BRRip.AC3.x264-LESS.mkv',
      ),
    ).toBe('The Train Job');
    expect(
      canonicalTitleFromFileName('/tv/Firefly/Season 1/Firefly.S01E06.Our.Mrs.Reynolds.mkv'),
    ).toBe('Our Mrs Reynolds');
  });

  it('handles the "Show - S01E02 - Title" style', () => {
    expect(
      canonicalTitleFromFileName('/tv/Show/Season 1/Show - S01E02 - The Train Job.mkv'),
    ).toBe('The Train Job');
  });

  it('stops at quality tokens and never invents a title', () => {
    expect(canonicalTitleFromFileName('/tv/X/Firefly.S01E01.1080p.BRRip.x264.mkv')).toBeNull();
    expect(canonicalTitleFromFileName('/tv/X/no-episode-marker.mkv')).toBeNull();
    expect(canonicalTitleFromFileName(null)).toBeNull();
  });
});

describe('planEpisodeReorder', () => {
  it('moves each canonical title onto the episode whose file carries it', () => {
    const changes = planEpisodeReorder(fireflyRows);
    const byEpisode = new Map(changes.map(change => [change.episodeNumber, change.toTitle]));

    // Episode 1's file is "Serenity", so episode 1 must end up titled Serenity.
    expect(byEpisode.get(1)).toBe('Serenity');
    expect(byEpisode.get(2)).toBe('The Train Job');
    expect(byEpisode.get(3)).toBe('Bushwhacked');
    expect(byEpisode.get(4)).toBe('Shindig');
    expect(byEpisode.get(5)).toBe('Safe');
    expect(byEpisode.get(6)).toBe('Our Mrs. Reynolds');
    expect(byEpisode.get(8)).toBe('Out of Gas');
    expect(byEpisode.get(9)).toBe('Ariel');
    expect(byEpisode.get(10)).toBe('War Stories');
    expect(byEpisode.get(11)).toBe('Trash');
    expect(byEpisode.get(12)).toBe('The Message');
    expect(byEpisode.get(13)).toBe('Heart of Gold');
    expect(byEpisode.get(14)).toBe('Objects in Space');
    expect(changes).toHaveLength(14); // every episode moves: no fixed point in this permutation
  });

  it('is a no-op when the metadata already matches the files', () => {
    const alreadyCorrect: ReorderRow[] = [
      {
        id: 1,
        episodeNumber: 1,
        title: 'Serenity',
        overview: 'pilot',
        airDateUtc: 1,
        filePath: '/tv/Firefly/S01E01.Serenity.mkv',
      },
      {
        id: 2,
        episodeNumber: 2,
        title: 'The Train Job',
        overview: 'train',
        airDateUtc: 2,
        filePath: '/tv/Firefly/S01E02.The.Train.Job.mkv',
      },
    ];
    expect(planEpisodeReorder(alreadyCorrect)).toEqual([]);
  });

  it('skips episodes without a file (specials, missing episodes)', () => {
    const rows: ReorderRow[] = [
      {
        id: 10,
        episodeNumber: 1,
        title: 'A',
        overview: null,
        airDateUtc: null,
        filePath: null,
      },
      {
        id: 11,
        episodeNumber: 2,
        title: 'B',
        overview: null,
        airDateUtc: null,
        filePath: '/tv/X/S01E02.C.mkv',
      },
    ];
    expect(planEpisodeReorder(rows)).toEqual([]);
  });
});

describe('metadataForRow', () => {
  it('returns the whole triple (title, synopsis, air date) for the file title', () => {
    const row = fireflyRows[0]!; // episode 1, file says Serenity
    const target = metadataForRow(row, fireflyRows);
    expect(target?.title).toBe('Serenity');
    expect(target?.overview).toContain('In desperate times');
    expect(target?.airDateUtc).toBe(1040342400);
  });
});
