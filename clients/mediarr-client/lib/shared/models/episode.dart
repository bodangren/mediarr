/// Episode data model.
class Episode {
  const Episode({
    required this.id,
    required this.seasonNumber,
    required this.episodeNumber,
    this.title,
    this.overview,
    this.airDateUtc,
    this.hasFile = false,
    this.monitored = false,
    this.quality,
  });

  final int id;
  final int seasonNumber;
  final int episodeNumber;
  final String? title;
  final String? overview;
  final String? airDateUtc;
  final bool hasFile;
  final bool monitored;
  final String? quality;

  factory Episode.fromJson(Map<String, dynamic> json) {
    return Episode(
      id: json['id'] as int,
      seasonNumber: json['seasonNumber'] as int,
      episodeNumber: json['episodeNumber'] as int,
      title: json['title'] as String?,
      overview: json['overview'] as String?,
      airDateUtc: json['airDateUtc'] as String?,
      hasFile: json['hasFile'] as bool? ?? false,
      monitored: json['monitored'] as bool? ?? false,
      quality: json['quality'] as String?,
    );
  }
}
