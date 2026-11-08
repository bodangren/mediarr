/// One item of the Adult library (track feature_adult_library_20261107).
///
/// Deliberately its own model: the Adult library is a separate domain with its own root, its own
/// playback state and a review bucket, so it must never be parsed as a Movie or a LibraryItem.
class AdultItem {
  const AdultItem({
    required this.id,
    required this.fileName,
    required this.path,
    required this.sizeBytes,
    this.title,
    this.studio,
    this.quality,
    this.releaseDate,
    this.needsReview = false,
  });

  final int id;
  final String fileName;
  final String path;
  final int sizeBytes;
  final String? title;
  final String? studio;
  final String? quality;
  final String? releaseDate;

  /// The filename carried no title; a human/agent decision is required.
  final bool needsReview;

  /// What a viewer sees: the parsed title when there is one, otherwise the raw filename so a
  /// review-bucket file is still identifiable.
  String get displayTitle {
    final candidate = title?.trim();
    if (candidate != null && candidate.isNotEmpty) return candidate;
    return fileName;
  }

  /// Secondary line: studio / quality / release date, whichever are present.
  String get subtitleLine {
    final parts = [studio, quality, releaseDate]
        .map((value) => value?.trim())
        .whereType<String>()
        .where((value) => value.isNotEmpty)
        .toList();
    return parts.join(' · ');
  }

  factory AdultItem.fromJson(Map<String, dynamic> json) {
    return AdultItem(
      id: json['id'] as int,
      fileName: json['fileName'] as String? ?? '',
      path: json['path'] as String? ?? '',
      sizeBytes: (json['sizeBytes'] as num?)?.toInt() ?? 0,
      title: json['title'] as String?,
      studio: json['studio'] as String?,
      quality: json['quality'] as String?,
      releaseDate: json['releaseDate'] as String?,
      needsReview: json['needsReview'] as bool? ?? false,
    );
  }
}
