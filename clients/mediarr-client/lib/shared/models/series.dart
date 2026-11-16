import 'season.dart';
import 'subtitle_availability.dart';

/// Series data model matching the Mediarr server API response.
class Series {
  const Series({
    required this.id,
    required this.title,
    this.year,
    this.overview,
    this.posterUrl,
    this.backdropUrl,
    this.quality,
    this.network,
    this.status,
    this.monitored = false,
    this.seasonCount,
    this.episodeCount,
    this.episodeFileCount,
    this.sizeOnDisk,
    this.path,
    this.seasons = const [],
    this.statistics,
    this.subtitleAvailability = SubtitleAvailability.none,
  });

  final int id;
  final String title;
  final int? year;
  final String? overview;
  final String? posterUrl;

  /// Landscape art (server field `backdropUrl`). The hero banner uses this
  /// as its full-bleed backdrop (FR-14).
  final String? backdropUrl;

  /// Quality label from the API (`quality` or the `qualityProfile` name).
  final String? quality;
  final String? network;
  final String? status;
  final bool monitored;
  final int? seasonCount;
  final int? episodeCount;
  final int? episodeFileCount;
  final int? sizeOnDisk;
  final String? path;
  final List<Season> seasons;
  final Map<String, dynamic>? statistics;

  /// Series-level subtitle roll-up from the series *detail* payload: true when
  /// at least one episode on disk carries that language. Episode tiles use
  /// [Episode.subtitleAvailability] for per-episode truth. The series *list*
  /// payload does not send this field, so it defaults to empty there.
  final SubtitleAvailability subtitleAvailability;

  /// Episodes the server reports as watched; drives the ✓ count badge on the series poster.
  int? get watchedEpisodeCount {
    final value = statistics?['watchedEpisodes'];
    if (value is num) return value.toInt();
    return null;
  }

  factory Series.fromJson(Map<String, dynamic> json) {
    final rawSeasons = json['seasons'] as List<dynamic>?;
    final seasonList = rawSeasons
            ?.map((s) => Season.fromJson(s as Map<String, dynamic>))
            .toList() ??
        [];
    final stats = json['statistics'] as Map<String, dynamic>?;
    return Series(
      id: json['id'] as int,
      title: json['title'] as String,
      year: json['year'] as int?,
      overview: json['overview'] as String?,
      posterUrl: json['posterUrl'] as String?,
      backdropUrl: json['backdropUrl'] as String?,
      quality: json['quality'] as String? ??
          ((json['qualityProfile'] is Map)
              ? (json['qualityProfile'] as Map)['name'] as String?
              : null),
      network: json['network'] as String?,
      status: json['status'] as String?,
      monitored: json['monitored'] as bool? ?? false,
      seasonCount: (json['seasonCount'] ??
          stats?['totalEpisodes']) as int?,
      episodeCount: (json['episodeCount'] ??
          stats?['totalEpisodes']) as int?,
      episodeFileCount: (json['episodeFileCount'] ??
          stats?['episodesOnDisk']) as int?,
      sizeOnDisk: json['sizeOnDisk'] as int?,
      path: json['path'] as String?,
      seasons: seasonList,
      statistics: stats,
      subtitleAvailability: SubtitleAvailability.fromJson(
        json['subtitleAvailability'],
      ),
    );
  }
}
