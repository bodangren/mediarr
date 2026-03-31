import 'season.dart';

/// Series data model matching the Mediarr server API response.
class Series {
  const Series({
    required this.id,
    required this.title,
    this.year,
    this.overview,
    this.posterUrl,
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
  });

  final int id;
  final String title;
  final int? year;
  final String? overview;
  final String? posterUrl;
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
    );
  }
}
