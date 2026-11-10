import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/features/library/series_next_up.dart';
import 'package:mediarr_client/shared/models/episode.dart';
import 'package:mediarr_client/shared/models/season.dart';
import 'package:mediarr_client/shared/models/series.dart';

Episode _episode(
  int id,
  int season,
  int number, {
  bool hasFile = true,
  int position = 0,
  int duration = 1400,
  bool watched = false,
  DateTime? lastWatched,
}) =>
    Episode(
      id: id,
      seasonNumber: season,
      episodeNumber: number,
      title: 'S${season}E$number',
      hasFile: hasFile,
      monitored: true,
      playbackState: EpisodePlaybackState(
        position: position,
        duration: duration,
        isWatched: watched,
        lastWatched: lastWatched,
      ),
    );

Series _series(List<Season> seasons) => Series(
      id: 1,
      title: 'Test Series',
      monitored: true,
      seasons: seasons,
    );

Season _season(int number, List<Episode> episodes) => Season(
      id: 100 + number,
      seasonNumber: number,
      episodeCount: episodes.length,
      episodeFileCount: episodes.where((e) => e.hasFile).length,
      episodes: episodes,
    );

Episode? chosen(Series series) => chooseSeriesNextUp(series);

void main() {
  group('chooseSeriesNextUp', () {
    test('picks the most recently watched in-progress episode, not the furthest', () {
      final series = _series([
        _season(1, [
          _episode(11, 1, 1, position: 900, lastWatched: DateTime.utc(2026, 11, 1)),
          _episode(12, 1, 2, position: 120, lastWatched: DateTime.utc(2026, 11, 9)),
        ]),
      ]);

      expect(chosen(series)?.id, 12);
    });

    test('falls back to the first unwatched playable episode', () {
      final series = _series([
        _season(1, [
          _episode(11, 1, 1, watched: true, position: 1400),
          _episode(12, 1, 2, position: 0),
          _episode(13, 1, 3),
        ]),
      ]);

      expect(chosen(series)?.id, 12);
    });

    test('skips missing files even when they are the next unwatched episode', () {
      final series = _series([
        _season(1, [
          _episode(11, 1, 1, hasFile: false, position: 0),
          _episode(12, 1, 2, hasFile: false, position: 600),
          _episode(13, 1, 3),
        ]),
      ]);

      expect(chosen(series)?.id, 13);
    });

    test('includes specials (season 0) when the server lists them first', () {
      final series = _series([
        _season(0, [_episode(1, 0, 1)]),
        _season(1, [_episode(11, 1, 1)]),
      ]);

      expect(chosen(series)?.id, 1);
    });

    test('an in-progress special wins over regular episodes', () {
      final series = _series([
        _season(0, [_episode(1, 0, 1, position: 300)]),
        _season(1, [_episode(11, 1, 1)]),
      ]);

      expect(chosen(series)?.id, 1);
    });

    test('a watched in-progress row is not resumed', () {
      final series = _series([
        _season(1, [
          _episode(11, 1, 1, position: 1300, watched: true),
          _episode(12, 1, 2),
        ]),
      ]);

      expect(chosen(series)?.id, 12);
    });

    test('position at or below the 30 s threshold is not in progress', () {
      final series = _series([
        _season(1, [
          _episode(11, 1, 1, position: 30),
          _episode(12, 1, 2),
        ]),
      ]);

      expect(chosen(series)?.id, 11, reason: 'First unwatched playable, not resume.');
    });

    test('when everything is watched it replays the first playable episode', () {
      final series = _series([
        _season(1, [
          _episode(11, 1, 1, position: 0, watched: true),
          _episode(12, 1, 2, position: 1400, watched: true),
        ]),
      ]);

      expect(chosen(series)?.id, 11);
    });

    test('tie-breaks on position when no row has a lastWatched timestamp', () {
      final series = _series([
        _season(1, [
          _episode(11, 1, 1, position: 200),
          _episode(12, 1, 2, position: 800),
        ]),
      ]);

      expect(chosen(series)?.id, 12);
    });

    test('returns null when nothing is downloaded', () {
      final series = _series([
        _season(1, [
          _episode(11, 1, 1, hasFile: false),
          _episode(12, 1, 2, hasFile: false, position: 500),
        ]),
      ]);

      expect(chosen(series), isNull);
    });

    test('returns null for a series with no seasons', () {
      expect(chosen(_series([])), isNull);
    });
  });
}
