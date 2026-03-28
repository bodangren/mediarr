/// Series data model matching the Mediarr server API response.
class Series {
  const Series({
    required this.id,
    required this.title,
    this.year,
    this.overview,
    this.posterUrl,
    this.fanartUrl,
    this.monitored = false,
    this.seasonCount,
    this.episodeCount,
    this.episodeFileCount,
    this.sizeOnDisk,
    this.status,
    this.network,
    this.path,
  });

  final int id;
  final String title;
  final int? year;
  final String? overview;
  final String? posterUrl;
  final String? fanartUrl;
  final bool monitored;
  final int? seasonCount;
  final int? episodeCount;
  final int? episodeFileCount;
  final int? sizeOnDisk;
  final String? status;
  final String? network;
  final String? path;

  factory Series.fromJson(Map<String, dynamic> json) {
    return Series(
      id: json['id'] as int,
      title: json['title'] as String,
      year: json['year'] as int?,
      overview: json['overview'] as String?,
      posterUrl: json['posterUrl'] as String?,
      fanartUrl: json['fanartUrl'] as String?,
      monitored: json['monitored'] as bool? ?? false,
      seasonCount: json['seasonCount'] as int?,
      episodeCount: json['episodeCount'] as int?,
      episodeFileCount: json['episodeFileCount'] as int?,
      sizeOnDisk: json['sizeOnDisk'] as int?,
      status: json['status'] as String?,
      network: json['network'] as String?,
      path: json['path'] as String?,
    );
  }
}
