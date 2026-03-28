/// Movie data model matching the Mediarr server API response.
class Movie {
  const Movie({
    required this.id,
    required this.title,
    this.year,
    this.overview,
    this.posterUrl,
    this.fanartUrl,
    this.monitored = false,
    this.hasFile = false,
    this.quality,
    this.sizeOnDisk,
    this.runtime,
    this.path,
  });

  final int id;
  final String title;
  final int? year;
  final String? overview;
  final String? posterUrl;
  final String? fanartUrl;
  final bool monitored;
  final bool hasFile;
  final String? quality;
  final int? sizeOnDisk;
  final int? runtime;
  final String? path;

  factory Movie.fromJson(Map<String, dynamic> json) {
    return Movie(
      id: json['id'] as int,
      title: json['title'] as String,
      year: json['year'] as int?,
      overview: json['overview'] as String?,
      posterUrl: json['posterUrl'] as String?,
      fanartUrl: json['fanartUrl'] as String?,
      monitored: json['monitored'] as bool? ?? false,
      hasFile: json['hasFile'] as bool? ?? false,
      quality: json['quality'] as String?,
      sizeOnDisk: json['sizeOnDisk'] as int?,
      runtime: json['runtime'] as int?,
      path: json['path'] as String?,
    );
  }
}
