/// A single playable file variant for a movie or episode.
///
/// The server returns variants under `fileVariants` and may use either
/// `filePath` or `path` for the on-disk location. The UI only needs to
/// know that a variant exists, so most fields are optional.
class MediaFileVariant {
  const MediaFileVariant({
    this.path,
    this.quality,
  });

  final String? path;
  final String? quality;

  factory MediaFileVariant.fromJson(Map<String, dynamic> json) {
    return MediaFileVariant(
      path: json['filePath'] as String? ?? json['path'] as String?,
      quality: json['quality'] as String?,
    );
  }
}
