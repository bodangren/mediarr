import '../../shared/models/episode.dart';
import '../../shared/models/series.dart';

/// The episode the series' primary Resume/Play action plays.
///
/// Pure and table-tested (`test/features/library/series_next_up_test.dart`),
/// because this is the one decision the owner noticed going wrong in several
/// different ways: greatest position is not the same as the most recent
/// activity, a watched episode must not resume, and a missing file must never
/// be chosen even when the metadata says it is the next unwatched one.
///
/// Preference order:
///  1. the most recently watched in-progress episode (position beyond the
///     30 s "did you actually start it" threshold, not marked watched);
///  2. else the first unwatched episode that has a file;
///  3. else the first episode that has a file (everything watched);
///  4. else null — nothing is downloaded, so the caller shows the actionable
///     "No downloaded episodes" state.
///
/// Episodes are considered in the server's season/episode order, so a series
/// whose specials (season 0) are meant to be watched first is watched that way
/// and matches the order the detail screen lists.
Episode? chooseSeriesNextUp(Series series) {
  Episode? firstPlayable;
  Episode? firstUnwatchedPlayable;
  Episode? inProgress;
  DateTime? bestWatchedAt;
  var bestPosition = 0;

  for (final season in series.seasons) {
    for (final episode in season.episodes) {
      if (!episode.effectiveHasFile) continue;
      firstPlayable ??= episode;
      if (!(episode.playbackState?.isWatched ?? false)) {
        firstUnwatchedPlayable ??= episode;
      }
      final state = episode.playbackState;
      if (state == null || state.isWatched || state.position <= 30) continue;
      final watchedAt = state.lastWatched;
      final isNewer =
          watchedAt != null && (bestWatchedAt == null || watchedAt.isAfter(bestWatchedAt));
      // Older rows have no lastWatched; among those the furthest position is
      // the best guess at "most recently watched".
      final isTieBreak =
          watchedAt == null && bestWatchedAt == null && state.position > bestPosition;
      if (isNewer || isTieBreak) {
        bestWatchedAt = watchedAt ?? bestWatchedAt;
        bestPosition = state.position;
        inProgress = episode;
      }
    }
  }

  return inProgress ?? firstUnwatchedPlayable ?? firstPlayable;
}
