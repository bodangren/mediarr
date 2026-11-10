import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mediarr_client/shared/models/episode.dart';
import 'package:mediarr_client/shared/models/season.dart';
import 'package:mediarr_client/shared/models/series.dart';
import 'package:mediarr_client/shared/models/youtube_video.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// One upcoming episode in the play queue (FR-3).
///
/// The queue holds ids and labels only, never media objects, so a long season
/// costs almost nothing.
@immutable
class PlaybackQueueItem {
  const PlaybackQueueItem({
    required this.mediaId,
    required this.title,
    required this.seasonNumber,
    required this.episodeNumber,
  });

  final int mediaId;
  final String title;
  final int seasonNumber;
  final int episodeNumber;

  /// `S01E02` style label used by the Up Next card.
  String get label =>
      'S${seasonNumber.toString().padLeft(2, '0')}'
      'E${episodeNumber.toString().padLeft(2, '0')}';

  @override
  bool operator ==(Object other) =>
      other is PlaybackQueueItem &&
      other.mediaId == mediaId &&
      other.title == title &&
      other.seasonNumber == seasonNumber &&
      other.episodeNumber == episodeNumber;

  @override
  int get hashCode => Object.hash(mediaId, title, seasonNumber, episodeNumber);
}

/// Builds the queue that follows [episodeId] in [series] (FR-3).
///
/// The order is the remaining episodes of the current season by episode
/// number, then every following season in order, so a queue crosses a season
/// boundary the way a viewer expects. Specials (season 0) sort before the
/// regular seasons.
///
/// Returns an empty list when [episodeId] is not part of [series], which is
/// what disables autoplay for that playback.
List<PlaybackQueueItem> buildEpisodeQueue(Series series, {required int episodeId}) {
  final ordered = <_QueueEpisode>[];

  for (final season in series.seasons) {
    for (final episode in season.episodes) {
      ordered.add(_QueueEpisode(season, episode));
    }
  }

  ordered.sort((a, b) {
    final bySeason = a.season.seasonNumber.compareTo(b.season.seasonNumber);
    if (bySeason != 0) return bySeason;
    return a.episode.episodeNumber.compareTo(b.episode.episodeNumber);
  });

  final startIndex = ordered.indexWhere((entry) => entry.episode.id == episodeId);
  if (startIndex < 0) return const [];

  return ordered
      .skip(startIndex + 1)
      .map(
        (entry) => PlaybackQueueItem(
          mediaId: entry.episode.id,
          title: entry.episode.title ?? 'Episode ${entry.episode.episodeNumber}',
          seasonNumber: entry.season.seasonNumber,
          episodeNumber: entry.episode.episodeNumber,
        ),
      )
      .toList(growable: false);
}

class _QueueEpisode {
  const _QueueEpisode(this.season, this.episode);

  final Season season;
  final Episode episode;
}

/// One upcoming YouTube video in the play queue.
///
/// The YouTube library has no seasons, so only the id and title travel: the
/// stream URL and progress endpoint are derived from the video id, exactly the
/// same way a single-video play does.
@immutable
class YoutubePlaybackItem {
  const YoutubePlaybackItem({required this.mediaId, required this.title});

  final int mediaId;
  final String title;

  @override
  bool operator ==(Object other) =>
      other is YoutubePlaybackItem &&
      other.mediaId == mediaId &&
      other.title == title;

  @override
  int get hashCode => Object.hash(mediaId, title);
}

/// Builds the YouTube queue that follows [startVideoId] in [videos].
///
/// The order is the order the library is showing (sort/filter/search already
/// applied), so "Play all" plays the visible list, not the raw table. Returns
/// an empty list when [startVideoId] is not in [videos], which disables
/// autoplay for that playback.
List<YoutubePlaybackItem> buildYoutubeQueue(
  List<YoutubeVideo> videos, {
  required int startVideoId,
}) {
  final startIndex = videos.indexWhere((video) => video.id == startVideoId);
  if (startIndex < 0) return const [];
  return videos
      .skip(startIndex + 1)
      .map((video) => YoutubePlaybackItem(mediaId: video.id, title: video.title))
      .toList(growable: false);
}

/// Whether autoplay of the next episode is enabled (FR-3).
///
/// Persisted with `shared_preferences`, the same store the server address uses.
/// Defaults to on, because the owner asked for Netflix-style auto-advance.
final autoplayNextEpisodeProvider = FutureProvider<bool>((ref) async {
  final prefs = await _prefsOrNull();
  return prefs?.getBool(kAutoplayNextEpisodeKey) ?? true;
});

/// Writes the autoplay preference. Safe to call before the first read.
Future<void> setAutoplayNextEpisode(bool enabled) async {
  final prefs = await _prefsOrNull();
  await prefs?.setBool(kAutoplayNextEpisodeKey, enabled);
}

const String kAutoplayNextEpisodeKey = 'mediarr.autoplayNextEpisode';

Future<SharedPreferences?> _prefsOrNull() async {
  try {
    return await SharedPreferences.getInstance();
  } catch (_) {
    // No platform store (for example a widget test): fall back to the default.
    return null;
  }
}