import 'media_file_variant.dart';

/// Movie data model matching the Mediarr server API response.
class Movie {
  const Movie({
    required this.id,
    required this.title,
    this.year,
    this.overview,
    this.posterUrl,
    this.backdropUrl,
    this.monitored = false,
    this.hasFile = false,
    this.quality,
    this.sizeOnDisk,
    this.runtime,
    this.path,
    this.fileVariants,
  });

  final int id;
  final String title;
  final int? year;
  final String? overview;
  final String? posterUrl;

  /// Landscape art (server field `backdropUrl`). The hero banner uses this
  /// as its full-bleed backdrop (FR-14).
  final String? backdropUrl;
  final bool monitored;
  final bool hasFile;
  final String? quality;
  final int? sizeOnDisk;
  final int? runtime;
  final String? path;
  final List<MediaFileVariant>? fileVariants;

  /// Effective playability flag.
  ///
  /// The server may omit `hasFile` or set it to `false` while still including
  /// a playable [path] or [fileVariants]. A movie is playable when any of the
  /// three signals is present.
  bool get effectiveHasFile =>
      hasFile ||
      (path?.isNotEmpty ?? false) ||
      (fileVariants?.isNotEmpty ?? false);

  factory Movie.fromJson(Map<String, dynamic> json) {
    final rawVariants = json['fileVariants'] as List<dynamic>?;
    return Movie(
      id: json['id'] as int,
      title: json['title'] as String,
      year: json['year'] as int?,
      overview: json['overview'] as String?,
      posterUrl: json['posterUrl'] as String?,
      backdropUrl: json['backdropUrl'] as String? ?? json['fanartUrl'] as String?,
      monitored: json['monitored'] as bool? ?? false,
      hasFile: json['hasFile'] as bool? ?? false,
      quality: json['quality'] as String? ?? _qualityProfileName(json),
      sizeOnDisk: json['sizeOnDisk'] as int?,
      runtime: json['runtime'] as int?,
      path: json['path'] as String?,
      fileVariants: rawVariants
          ?.map((v) => MediaFileVariant.fromJson(v as Map<String, dynamic>))
          .toList(),
    );
  }
}

/// Quality label from the embedded `qualityProfile` relation (for example
/// `HD-1080p`). The movie DTO omits file variants, so the profile name is
/// the only quality signal on the detail response.
String? _qualityProfileName(Map<String, dynamic> json) {
  final profile = json['qualityProfile'];
  if (profile is Map) return profile['name'] as String?;
  return null;
}
