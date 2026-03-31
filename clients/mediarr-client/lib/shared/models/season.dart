import 'episode.dart';

/// Season data model matching the server API response.
///
/// Seasons are nested inside the series response from
/// `GET /api/series/:id`.
class Season {
  const Season({
    required this.id,
    required this.seasonNumber,
    this.monitored = false,
    this.episodeCount,
    this.episodeFileCount,
    this.episodes = const [],
    this.sizeOnDisk,
  });

  final int id;
  final int seasonNumber;
  final bool monitored;
  final int? episodeCount;
  final int? episodeFileCount;
  final int? sizeOnDisk;
  final List<Episode> episodes;

  factory Season.fromJson(Map<String, dynamic> json) {
    final rawEpisodes = json['episodes'] as List<dynamic>?;
    final episodeList = rawEpisodes
            ?.map((e) => Episode.fromJson(e as Map<String, dynamic>))
            .toList() ??
        [];
    final stats = json['statistics'] as Map<String, dynamic>?;
    return Season(
      id: json['id'] as int? ?? 0,
      seasonNumber: json['seasonNumber'] as int,
      monitored: json['monitored'] as bool? ?? false,
      episodeCount: (json['episodeCount'] ??
          stats?['totalEpisodes']) as int?,
      episodeFileCount: (json['episodeFileCount'] ??
          stats?['episodesOnDisk']) as int?,
      sizeOnDisk: json['sizeOnDisk'] as int?,
      episodes: episodeList,
    );
  }
}
