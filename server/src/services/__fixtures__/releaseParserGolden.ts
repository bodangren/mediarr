// Golden fixture of real-world scene/p2p release titles for ReleaseParser accuracy testing.
//
// `expected` is the accuracy oracle — what a CORRECT parser (AI-backed) should return.
// `regexFallbackExpected` is what the CURRENT regex-only fallback in ReleaseParser.ts
// (the `regexFallback` function) actually returns for the same title today. The two are
// deliberately different in most cases: the regex fallback only recognises SxxExx and a
// lone Sxx marker, always returns `year: null` and `quality: null`, and returns `null`
// entirely for movies, NNxNN titles, and anime absolute-numbering titles.
//
// Do not "fix" `regexFallbackExpected` values to look more correct — they must describe
// what the current implementation actually does, including its known bugs (e.g. a season
// range like "S01-S09" makes the lone-season branch misfire and return a season_pack for
// season 1 instead of null).

import type { ParsedRelease } from '../ReleaseParser';
import { ParsedReleaseSchema } from '../ReleaseParser';

export interface GoldenEntry {
  title: string;
  expected: ParsedRelease;
  regexFallbackExpected: ParsedRelease | null;
  notes: string;
}

export const RELEASE_PARSER_GOLDEN: readonly GoldenEntry[] = [
  {
    title: 'Breaking.Bad.S03E05.Mas.720p.BluRay.x264-DEMAND',
    expected: { title: 'Breaking Bad', type: 'series', matchType: 'episode', seasonNumber: 3, episodeNumbers: [5], year: null, quality: { resolution: '720p', source: 'BluRay', codec: 'x264' } },
    regexFallbackExpected: { title: 'Breaking Bad', type: 'series', matchType: 'episode', seasonNumber: 3, episodeNumbers: [5], year: null, quality: null },
    notes: 'single episode, standard SxxExx',
  },
  {
    title: 'The.Wire.S04E09.Know.Your.Place.480p.HDTV.XviD-GROUP',
    expected: { title: 'The Wire', type: 'series', matchType: 'episode', seasonNumber: 4, episodeNumbers: [9], year: null, quality: { resolution: '480p', source: 'HDTV', codec: 'XviD' } },
    regexFallbackExpected: { title: 'The Wire', type: 'series', matchType: 'episode', seasonNumber: 4, episodeNumbers: [9], year: null, quality: null },
    notes: 'single episode, 480p HDTV XviD',
  },
  {
    title: 'Game.of.Thrones.S08E05E06.1080p.WEB-DL.DD5.1.H264-GoT',
    expected: { title: 'Game of Thrones', type: 'series', matchType: 'episode', seasonNumber: 8, episodeNumbers: [5, 6], year: null, quality: { resolution: '1080p', source: 'WEB-DL', codec: 'AVC' } },
    regexFallbackExpected: { title: 'Game of Thrones', type: 'series', matchType: 'episode', seasonNumber: 8, episodeNumbers: [5, 6], year: null, quality: null },
    notes: 'multi-episode (2), H264 tag maps to AVC codec',
  },
  {
    title: 'Rick.and.Morty.S05E01E02.720p.WEBRip.x265-RARBG',
    expected: { title: 'Rick and Morty', type: 'series', matchType: 'episode', seasonNumber: 5, episodeNumbers: [1, 2], year: null, quality: { resolution: '720p', source: 'WEBRip', codec: 'x265' } },
    regexFallbackExpected: { title: 'Rick and Morty', type: 'series', matchType: 'episode', seasonNumber: 5, episodeNumbers: [1, 2], year: null, quality: null },
    notes: 'multi-episode (2), WEBRip source, x265 codec',
  },
  {
    title: 'Chernobyl.S01E01E02E03.1080p.AMZN.WEB-DL.DDP5.1.H264-NTb',
    expected: { title: 'Chernobyl', type: 'series', matchType: 'episode', seasonNumber: 1, episodeNumbers: [1, 2, 3], year: null, quality: { resolution: '1080p', source: 'AMZN', codec: 'AVC' } },
    regexFallbackExpected: { title: 'Chernobyl', type: 'series', matchType: 'episode', seasonNumber: 1, episodeNumbers: [1, 2, 3], year: null, quality: null },
    notes: 'multi-episode (3), Amazon WEB-DL source',
  },
  {
    title: 'House.1x05.720p.HDTV.x264-KILLERS',
    expected: { title: 'House', type: 'series', matchType: 'episode', seasonNumber: 1, episodeNumbers: [5], year: null, quality: { resolution: '720p', source: 'HDTV', codec: 'x264' } },
    regexFallbackExpected: null,
    notes: 'NNxNN form, older scene convention',
  },
  {
    title: 'Prison.Break.2x14.480p.DVDRip.XviD-SAiNTS',
    expected: { title: 'Prison Break', type: 'series', matchType: 'episode', seasonNumber: 2, episodeNumbers: [14], year: null, quality: { resolution: '480p', source: 'DVDRip', codec: 'XviD' } },
    regexFallbackExpected: null,
    notes: 'NNxNN form, DVDRip source',
  },
  {
    title: 'The.Sopranos.S03.1080p.BluRay.x264-ROVERS',
    expected: { title: 'The Sopranos', type: 'series', matchType: 'season_pack', seasonNumber: 3, episodeNumbers: [], year: null, quality: { resolution: '1080p', source: 'BluRay', codec: 'x264' } },
    regexFallbackExpected: { title: 'The Sopranos', type: 'series', matchType: 'season_pack', seasonNumber: 3, episodeNumbers: [], year: null, quality: null },
    notes: 'season pack, lone Sxx marker',
  },
  {
    title: 'Peaky.Blinders.S06.720p.WEB-DL.x264-GROUP',
    expected: { title: 'Peaky Blinders', type: 'series', matchType: 'season_pack', seasonNumber: 6, episodeNumbers: [], year: null, quality: { resolution: '720p', source: 'WEB-DL', codec: 'x264' } },
    regexFallbackExpected: { title: 'Peaky Blinders', type: 'series', matchType: 'season_pack', seasonNumber: 6, episodeNumbers: [], year: null, quality: null },
    notes: 'season pack, WEB-DL source',
  },
  {
    title: 'Friends.Complete.Series.720p.BluRay.x264-PSA',
    expected: { title: 'Friends', type: 'series', matchType: 'complete_series', seasonNumber: null, episodeNumbers: [], year: null, quality: { resolution: '720p', source: 'BluRay', codec: 'x264' } },
    regexFallbackExpected: null,
    notes: 'complete series, no season marker at all',
  },
  {
    title: 'Seinfeld.S01-S09.Complete.480p.DVDRip.XviD-GROUP',
    expected: { title: 'Seinfeld', type: 'series', matchType: 'complete_series', seasonNumber: null, episodeNumbers: [], year: null, quality: { resolution: '480p', source: 'DVDRip', codec: 'XviD' } },
    regexFallbackExpected: { title: 'Seinfeld', type: 'series', matchType: 'season_pack', seasonNumber: 1, episodeNumbers: [], year: null, quality: null },
    notes: 'complete series via season range; regex fallback misfires on the lone S01',
  },
  {
    title: 'Oppenheimer.2023.2160p.UHD.BluRay.x265-TERMiNAL',
    expected: { title: 'Oppenheimer', type: 'movie', matchType: 'complete_series', seasonNumber: null, episodeNumbers: [], year: null, quality: { resolution: 'unknown', source: 'BluRay', codec: 'x265' } },
    regexFallbackExpected: null,
    notes: 'movie, release year is not disambiguation year, UHD -> unknown resolution',
  },
  {
    title: 'Dune.Part.Two.2024.1080p.WEB-DL.DDP5.1.Atmos.H264-FLUX',
    expected: { title: 'Dune Part Two', type: 'movie', matchType: 'complete_series', seasonNumber: null, episodeNumbers: [], year: null, quality: { resolution: '1080p', source: 'WEB-DL', codec: 'AVC' } },
    regexFallbackExpected: null,
    notes: 'movie, release year stripped from title and year field',
  },
  {
    title: '[SubsPlease] Frieren - 28 (1080p) [ABCD1234].mkv',
    expected: { title: 'Frieren', type: 'series', matchType: 'episode', seasonNumber: null, episodeNumbers: [28], year: null, quality: { resolution: '1080p', source: null, codec: null } },
    regexFallbackExpected: null,
    notes: 'anime absolute numbering, no season concept',
  },
  {
    title: '[Erai-raws] Jujutsu Kaisen - 47 [1080p][Multiple Subtitle].mkv',
    expected: { title: 'Jujutsu Kaisen', type: 'series', matchType: 'episode', seasonNumber: null, episodeNumbers: [47], year: null, quality: { resolution: '1080p', source: null, codec: null } },
    regexFallbackExpected: null,
    notes: 'anime absolute numbering, multiple subtitle tag ignored',
  },
  {
    title: 'Archer.2009.S10E04.Lowjack.720p.WEB-DL.x264-GROUP',
    expected: { title: 'Archer', type: 'series', matchType: 'episode', seasonNumber: 10, episodeNumbers: [4], year: 2009, quality: { resolution: '720p', source: 'WEB-DL', codec: 'x264' } },
    regexFallbackExpected: { title: 'Archer 2009', type: 'series', matchType: 'episode', seasonNumber: 10, episodeNumbers: [4], year: null, quality: null },
    notes: 'disambiguation year in series title (Archer 2009)',
  },
  {
    title: 'Doctor.Who.2005.S13E01.1080p.HDTV.x264-MTB',
    expected: { title: 'Doctor Who', type: 'series', matchType: 'episode', seasonNumber: 13, episodeNumbers: [1], year: 2005, quality: { resolution: '1080p', source: 'HDTV', codec: 'x264' } },
    regexFallbackExpected: { title: 'Doctor Who 2005', type: 'series', matchType: 'episode', seasonNumber: 13, episodeNumbers: [1], year: null, quality: null },
    notes: 'disambiguation year in series title (Doctor Who 2005 reboot)',
  },
  {
    title: 'Batman.Begins.2005.1080p.BluRay.x264-GROUP',
    expected: { title: 'Batman Begins', type: 'movie', matchType: 'complete_series', seasonNumber: null, episodeNumbers: [], year: null, quality: { resolution: '1080p', source: 'BluRay', codec: 'x264' } },
    regexFallbackExpected: null,
    notes: 'movie release year is NOT disambiguation year -> year null',
  },
  {
    title: 'The.Batman.2022.2160p.UHD.BluRay.REMUX.HEVC.DTS-HD.MA.5.1-GROUP',
    expected: { title: 'The Batman', type: 'movie', matchType: 'complete_series', seasonNumber: null, episodeNumbers: [], year: null, quality: { resolution: 'unknown', source: 'REMUX', codec: 'HEVC' } },
    regexFallbackExpected: null,
    notes: 'movie, BluRay.REMUX -> source REMUX (not codec), UHD -> unknown resolution',
  },
  {
    title: 'Interstellar.2014.BluRay.REMUX.1080p.AVC.DTS-HD.MA.5.1-GROUP',
    expected: { title: 'Interstellar', type: 'movie', matchType: 'complete_series', seasonNumber: null, episodeNumbers: [], year: null, quality: { resolution: '1080p', source: 'REMUX', codec: 'AVC' } },
    regexFallbackExpected: null,
    notes: 'movie, REMUX source at 1080p (not UHD), literal AVC codec tag',
  },
  {
    title: 'The.Last.of.Us.S01E03.Long.Long.Time.2160p.WEB-DL.DDP5.1.HDR.HEVC-GROUP',
    expected: { title: 'The Last of Us', type: 'series', matchType: 'episode', seasonNumber: 1, episodeNumbers: [3], year: null, quality: { resolution: 'unknown', source: 'WEB-DL', codec: 'HEVC' } },
    regexFallbackExpected: { title: 'The Last of Us', type: 'series', matchType: 'episode', seasonNumber: 1, episodeNumbers: [3], year: null, quality: null },
    notes: 'single episode, 2160p/HDR -> unknown resolution, HEVC codec',
  },
  {
    title: 'Stranger.Things.S04E01.The.Hellfire.Club.2160p.NF.WEB-DL.DDP5.1.Atmos.HDR.HEVC-GROUP',
    expected: { title: 'Stranger Things', type: 'series', matchType: 'episode', seasonNumber: 4, episodeNumbers: [1], year: null, quality: { resolution: 'unknown', source: 'NF', codec: 'HEVC' } },
    regexFallbackExpected: { title: 'Stranger Things', type: 'series', matchType: 'episode', seasonNumber: 4, episodeNumbers: [1], year: null, quality: null },
    notes: 'single episode, Netflix streaming source tag preferred over WEB-DL',
  },
  {
    title: 'The.Mandalorian.S02E08.Chapter.16.The.Rescue.1080p.DSNP.WEB-DL.DDP5.1.H264-NTb',
    expected: { title: 'The Mandalorian', type: 'series', matchType: 'episode', seasonNumber: 2, episodeNumbers: [8], year: null, quality: { resolution: '1080p', source: 'DSNP', codec: 'AVC' } },
    regexFallbackExpected: { title: 'The Mandalorian', type: 'series', matchType: 'episode', seasonNumber: 2, episodeNumbers: [8], year: null, quality: null },
    notes: 'single episode, Disney+ streaming source tag, H264 -> AVC',
  },
  {
    title: 'House.M.D.S04E01E02.720p.BluRay.x264-GROUP',
    expected: { title: 'House M.D.', type: 'series', matchType: 'episode', seasonNumber: 4, episodeNumbers: [1, 2], year: null, quality: { resolution: '720p', source: 'BluRay', codec: 'x264' } },
    regexFallbackExpected: { title: 'House M D', type: 'series', matchType: 'episode', seasonNumber: 4, episodeNumbers: [1, 2], year: null, quality: null },
    notes: 'multi-episode (2), BluRay source',
  },
  {
    title: 'The.Simpsons.S34E01E02E03.1080p.WEB-DL.x264-GROUP',
    expected: { title: 'The Simpsons', type: 'series', matchType: 'episode', seasonNumber: 34, episodeNumbers: [1, 2, 3], year: null, quality: { resolution: '1080p', source: 'WEB-DL', codec: 'x264' } },
    regexFallbackExpected: { title: 'The Simpsons', type: 'series', matchType: 'episode', seasonNumber: 34, episodeNumbers: [1, 2, 3], year: null, quality: null },
    notes: 'triple-episode file, 2-digit season number',
  },
  {
    title: 'Better.Call.Saul.3x07.720p.AMZN.WEBRip.x264-GROUP',
    expected: { title: 'Better Call Saul', type: 'series', matchType: 'episode', seasonNumber: 3, episodeNumbers: [7], year: null, quality: { resolution: '720p', source: 'AMZN', codec: 'x264' } },
    regexFallbackExpected: null,
    notes: 'NNxNN form with Amazon source tag',
  },
  {
    title: 'Its.Always.Sunny.in.Philadelphia.6x05.480p.HDTV.x264-GROUP',
    expected: { title: 'Its Always Sunny in Philadelphia', type: 'series', matchType: 'episode', seasonNumber: 6, episodeNumbers: [5], year: null, quality: { resolution: '480p', source: 'HDTV', codec: 'x264' } },
    regexFallbackExpected: null,
    notes: 'NNxNN form, long multi-word title',
  },
  {
    title: 'Yellowstone.S05.1080p.WEB-DL.x264-GROUP',
    expected: { title: 'Yellowstone', type: 'series', matchType: 'season_pack', seasonNumber: 5, episodeNumbers: [], year: null, quality: { resolution: '1080p', source: 'WEB-DL', codec: 'x264' } },
    regexFallbackExpected: { title: 'Yellowstone', type: 'series', matchType: 'season_pack', seasonNumber: 5, episodeNumbers: [], year: null, quality: null },
    notes: 'season pack, single-word title',
  },
  {
    title: 'The.Crown.S06.2160p.NF.WEB-DL.DDP5.1.HDR.HEVC-GROUP',
    expected: { title: 'The Crown', type: 'series', matchType: 'season_pack', seasonNumber: 6, episodeNumbers: [], year: null, quality: { resolution: 'unknown', source: 'NF', codec: 'HEVC' } },
    regexFallbackExpected: { title: 'The Crown', type: 'series', matchType: 'season_pack', seasonNumber: 6, episodeNumbers: [], year: null, quality: null },
    notes: 'season pack at UHD resolution -> unknown, Netflix source',
  },
  {
    title: 'Band.of.Brothers.Complete.Series.1080p.BluRay.x264-SiNNERS',
    expected: { title: 'Band of Brothers', type: 'series', matchType: 'complete_series', seasonNumber: null, episodeNumbers: [], year: null, quality: { resolution: '1080p', source: 'BluRay', codec: 'x264' } },
    regexFallbackExpected: null,
    notes: 'complete series, explicit Complete.Series wording',
  },
  {
    title: 'Avatar.The.Last.Airbender.S01-S03.Complete.720p.BluRay.x264-GROUP',
    expected: { title: 'Avatar The Last Airbender', type: 'series', matchType: 'complete_series', seasonNumber: null, episodeNumbers: [], year: null, quality: { resolution: '720p', source: 'BluRay', codec: 'x264' } },
    regexFallbackExpected: { title: 'Avatar The Last Airbender', type: 'series', matchType: 'season_pack', seasonNumber: 1, episodeNumbers: [], year: null, quality: null },
    notes: 'complete series via season range; regex fallback misfires on the lone S01',
  },
  {
    title: 'Top.Gun.Maverick.2022.1080p.BluRay.x264-GROUP',
    expected: { title: 'Top Gun Maverick', type: 'movie', matchType: 'complete_series', seasonNumber: null, episodeNumbers: [], year: null, quality: { resolution: '1080p', source: 'BluRay', codec: 'x264' } },
    regexFallbackExpected: null,
    notes: 'movie, plain BluRay release',
  },
  {
    title: 'Everything.Everywhere.All.at.Once.2022.1080p.WEB-DL.DDP5.1.H264-GROUP',
    expected: { title: 'Everything Everywhere All at Once', type: 'movie', matchType: 'complete_series', seasonNumber: null, episodeNumbers: [], year: null, quality: { resolution: '1080p', source: 'WEB-DL', codec: 'AVC' } },
    regexFallbackExpected: null,
    notes: 'movie, long title, H264 -> AVC codec',
  },
  {
    title: '[SubsPlease] One Piece - 1085 (1080p) [XYZ98765].mkv',
    expected: { title: 'One Piece', type: 'series', matchType: 'episode', seasonNumber: null, episodeNumbers: [1085], year: null, quality: { resolution: '1080p', source: null, codec: null } },
    regexFallbackExpected: null,
    notes: 'anime absolute numbering, large episode number',
  },
  {
    title: '[Erai-raws] Attack on Titan - 88 [1080p].mkv',
    expected: { title: 'Attack on Titan', type: 'series', matchType: 'episode', seasonNumber: null, episodeNumbers: [88], year: null, quality: { resolution: '1080p', source: null, codec: null } },
    regexFallbackExpected: null,
    notes: 'anime absolute numbering, no hash suffix',
  },
  {
    title: 'Fargo.2014.S01E01.The.Crocodiles.Dilemma.720p.WEB-DL.x264-GROUP',
    expected: { title: 'Fargo', type: 'series', matchType: 'episode', seasonNumber: 1, episodeNumbers: [1], year: 2014, quality: { resolution: '720p', source: 'WEB-DL', codec: 'x264' } },
    regexFallbackExpected: { title: 'Fargo 2014', type: 'series', matchType: 'episode', seasonNumber: 1, episodeNumbers: [1], year: null, quality: null },
    notes: 'disambiguation year in series title (FX Fargo, premiered 2014)',
  },
  {
    title: 'Sherlock.2010.S04E03.The.Final.Problem.1080p.BluRay.x264-GROUP',
    expected: { title: 'Sherlock', type: 'series', matchType: 'episode', seasonNumber: 4, episodeNumbers: [3], year: 2010, quality: { resolution: '1080p', source: 'BluRay', codec: 'x264' } },
    regexFallbackExpected: { title: 'Sherlock 2010', type: 'series', matchType: 'episode', seasonNumber: 4, episodeNumbers: [3], year: null, quality: null },
    notes: 'disambiguation year in series title (BBC Sherlock, premiered 2010)',
  },
  {
    title: 'The.Office.2005.S02E01E02.720p.HDTV.x264-GROUP',
    expected: { title: 'The Office', type: 'series', matchType: 'episode', seasonNumber: 2, episodeNumbers: [1, 2], year: 2005, quality: { resolution: '720p', source: 'HDTV', codec: 'x264' } },
    regexFallbackExpected: { title: 'The Office 2005', type: 'series', matchType: 'episode', seasonNumber: 2, episodeNumbers: [1, 2], year: null, quality: null },
    notes: 'disambiguation year combined with multi-episode file',
  },
  {
    title: 'Killers.of.the.Flower.Moon.2023.2160p.WEB-DL.DDP5.1.Atmos.HEVC-GROUP',
    expected: { title: 'Killers of the Flower Moon', type: 'movie', matchType: 'complete_series', seasonNumber: null, episodeNumbers: [], year: null, quality: { resolution: 'unknown', source: 'WEB-DL', codec: 'HEVC' } },
    regexFallbackExpected: null,
    notes: 'movie at UHD -> unknown resolution',
  },
  {
    title: 'Mad.Max.Fury.Road.2015.BluRay.REMUX.1080p.AVC.DTS-HD.MA.7.1-GROUP',
    expected: { title: 'Mad Max Fury Road', type: 'movie', matchType: 'complete_series', seasonNumber: null, episodeNumbers: [], year: null, quality: { resolution: '1080p', source: 'REMUX', codec: 'AVC' } },
    regexFallbackExpected: null,
    notes: 'movie, BluRay.REMUX -> source REMUX at 1080p',
  },
  {
    title: 'John.Wick.Chapter.4.2023.2160p.UHD.BluRay.REMUX.HEVC.DTS-HD.MA.7.1-GROUP',
    expected: { title: 'John Wick Chapter 4', type: 'movie', matchType: 'complete_series', seasonNumber: null, episodeNumbers: [], year: null, quality: { resolution: 'unknown', source: 'REMUX', codec: 'HEVC' } },
    regexFallbackExpected: null,
    notes: 'movie, REMUX source combined with UHD -> unknown resolution',
  },
  {
    title: 'The.Boys.S04E01E02.2160p.AMZN.WEB-DL.DDP5.1.HDR.HEVC-GROUP',
    expected: { title: 'The Boys', type: 'series', matchType: 'episode', seasonNumber: 4, episodeNumbers: [1, 2], year: null, quality: { resolution: 'unknown', source: 'AMZN', codec: 'HEVC' } },
    regexFallbackExpected: { title: 'The Boys', type: 'series', matchType: 'episode', seasonNumber: 4, episodeNumbers: [1, 2], year: null, quality: null },
    notes: 'multi-episode (2) at UHD -> unknown resolution, Amazon source',
  },
  {
    title: 'Vikings.5x01.720p.AMZN.WEBRip.x264-GROUP',
    expected: { title: 'Vikings', type: 'series', matchType: 'episode', seasonNumber: 5, episodeNumbers: [1], year: null, quality: { resolution: '720p', source: 'AMZN', codec: 'x264' } },
    regexFallbackExpected: null,
    notes: 'NNxNN form, Amazon source tag',
  },
  {
    title: 'Its.Always.Sunny.in.Philadelphia.S10.1080p.WEB-DL.x264-GROUP',
    expected: { title: 'Its Always Sunny in Philadelphia', type: 'series', matchType: 'season_pack', seasonNumber: 10, episodeNumbers: [], year: null, quality: { resolution: '1080p', source: 'WEB-DL', codec: 'x264' } },
    regexFallbackExpected: { title: 'Its Always Sunny in Philadelphia', type: 'series', matchType: 'season_pack', seasonNumber: 10, episodeNumbers: [], year: null, quality: null },
    notes: 'season pack with 2-digit season number (S10) exercises lone-season boundary',
  },
  {
    title: 'Ted.Lasso.S03E01E02.1080p.ATVP.WEB-DL.DDP5.1.H264-NTb',
    expected: { title: 'Ted Lasso', type: 'series', matchType: 'episode', seasonNumber: 3, episodeNumbers: [1, 2], year: null, quality: { resolution: '1080p', source: 'ATVP', codec: 'AVC' } },
    regexFallbackExpected: { title: 'Ted Lasso', type: 'series', matchType: 'episode', seasonNumber: 3, episodeNumbers: [1, 2], year: null, quality: null },
    notes: 'multi-episode (2), Apple TV+ source tag',
  },
  {
    title: 'Only.Murders.in.the.Building.S03E01.1080p.HULU.WEB-DL.DDP5.1.H264-GROUP',
    expected: { title: 'Only Murders in the Building', type: 'series', matchType: 'episode', seasonNumber: 3, episodeNumbers: [1], year: null, quality: { resolution: '1080p', source: 'HULU', codec: 'AVC' } },
    regexFallbackExpected: { title: 'Only Murders in the Building', type: 'series', matchType: 'episode', seasonNumber: 3, episodeNumbers: [1], year: null, quality: null },
    notes: 'single episode, Hulu source tag',
  },
  {
    title: 'Justified.S01.PDTV.XviD-GROUP',
    expected: { title: 'Justified', type: 'series', matchType: 'season_pack', seasonNumber: 1, episodeNumbers: [], year: null, quality: { resolution: 'SD', source: 'PDTV', codec: 'XviD' } },
    regexFallbackExpected: { title: 'Justified', type: 'series', matchType: 'season_pack', seasonNumber: 1, episodeNumbers: [], year: null, quality: null },
    notes: 'season pack, no resolution marker -> SD, PDTV source',
  },
  {
    title: 'The.Great.British.Bake.Off.S05.DVD.XviD-GROUP',
    expected: { title: 'The Great British Bake Off', type: 'series', matchType: 'season_pack', seasonNumber: 5, episodeNumbers: [], year: null, quality: { resolution: 'SD', source: 'DVD', codec: 'XviD' } },
    regexFallbackExpected: { title: 'The Great British Bake Off', type: 'series', matchType: 'season_pack', seasonNumber: 5, episodeNumbers: [], year: null, quality: null },
    notes: 'season pack, no resolution marker -> SD, DVD source',
  },
];

export const GOLDEN_TITLES: readonly string[] = RELEASE_PARSER_GOLDEN.map(entry => entry.title);

// Module-load self-check: every `expected` and every non-null `regexFallbackExpected`
// must conform to ParsedReleaseSchema. This catches typos/shape drift in the fixture
// itself before it can silently pass or fail unrelated tests.
RELEASE_PARSER_GOLDEN.forEach((entry, index) => {
  const expectedResult = ParsedReleaseSchema.safeParse(entry.expected);
  if (!expectedResult.success) {
    throw new Error(
      `releaseParserGolden: entry ${index} ("${entry.title}") has an invalid "expected" value: ${expectedResult.error.message}`,
    );
  }

  if (entry.regexFallbackExpected !== null) {
    const fallbackResult = ParsedReleaseSchema.safeParse(entry.regexFallbackExpected);
    if (!fallbackResult.success) {
      throw new Error(
        `releaseParserGolden: entry ${index} ("${entry.title}") has an invalid "regexFallbackExpected" value: ${fallbackResult.error.message}`,
      );
    }
  }
});
