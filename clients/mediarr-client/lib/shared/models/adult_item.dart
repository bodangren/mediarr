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
    this.thumbUrl,
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

  /// Server-relative still (`/api/adult/items/:id/thumbnail`) when one is cached.
  final String? thumbUrl;

  /// What a viewer sees: the parsed title when there is one, otherwise the raw filename so a
  /// review-bucket file is still identifiable.
  String get displayTitle {
    final candidate = title?.trim();
    if (candidate != null && candidate.isNotEmpty) return candidate;
    // Review-bucket files fall back to a cleaned filename, never an ingest artefact like
    // "001 [1c6d5a2b].mp4" (review finding: filenames read as implementation detail).
    final cleaned = fileName
        .replaceAll(RegExp(r'\s*\[[^\]]+\]\s*'), ' ')
        .replaceAll(RegExp(r'\.[a-z0-9]+$', caseSensitive: false), '')
        .replaceAll(RegExp(r'\s+'), ' ')
        .trim();
    return cleaned.isEmpty ? fileName : cleaned;
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
      thumbUrl: json['thumbUrl'] as String?,
    );
  }
}

/// One page of the Adult library listing (`GET /api/adult/items`).
class AdultItemsPage {
  const AdultItemsPage({
    required this.items,
    required this.page,
    required this.pageSize,
    required this.totalCount,
    required this.needsReview,
  });

  final List<AdultItem> items;
  final int page;
  final int pageSize;
  final int totalCount;

  /// Items whose filename carried no title and need a human/agent decision.
  final int needsReview;

  int get totalPages => totalCount == 0 ? 1 : ((totalCount + pageSize - 1) ~/ pageSize);

  factory AdultItemsPage.fromJson(Map<String, dynamic> json) {
    final rawItems = json['items'] as List<dynamic>? ?? const [];
    return AdultItemsPage(
      items: rawItems
          .map((item) => AdultItem.fromJson(item as Map<String, dynamic>))
          .toList(),
      page: (json['page'] as num?)?.toInt() ?? 1,
      pageSize: (json['pageSize'] as num?)?.toInt() ?? 24,
      totalCount: (json['totalCount'] as num?)?.toInt() ?? rawItems.length,
      needsReview: (json['needsReview'] as num?)?.toInt() ?? 0,
    );
  }
}
