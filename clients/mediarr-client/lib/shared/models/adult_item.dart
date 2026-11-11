/// One item of the Adult library (track feature_adult_library_20261107).
///
/// Deliberately its own model: the Adult library is a separate domain with its own root, its own
/// playback state and a review bucket, so it must never be parsed as a Movie or a LibraryItem.
///
/// `keep`/decisions come from track feature_adult_retention_keep_delete_20261111: after an item is
/// watched the owner records one durable decision (keep or delete).
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
    this.keep = false,
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

  /// The owner decided to keep this file. Durable: automation must never propose or delete it.
  final bool keep;

  /// Server-relative still (`/api/adult/items/:id/thumbnail`) when one is cached.
  final String? thumbUrl;

  /// What a viewer sees: the parsed title when there is one, otherwise the raw filename so a
  /// review-bucket file is still identifiable.
  String get displayTitle => adultDisplayTitle(title, fileName);

  /// Secondary line: studio / quality / release date, whichever are present.
  String get subtitleLine => adultMetadataLine([studio, quality, releaseDate]);

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
      keep: json['keep'] as bool? ?? false,
      thumbUrl: json['thumbUrl'] as String?,
    );
  }
}

/// Display title for an adult row.
///
/// Review-bucket files fall back to a cleaned filename, never an ingest artefact like
/// "001 [1c6d5a2b].mp4" (review finding: filenames read as implementation detail).
String adultDisplayTitle(String? title, String fileName) {
  final candidate = title?.trim();
  if (candidate != null && candidate.isNotEmpty) return candidate;
  final cleaned = fileName
      .replaceAll(RegExp(r'\s*\[[^\]]+\]\s*'), ' ')
      .replaceAll(RegExp(r'\.[a-z0-9]+$', caseSensitive: false), '')
      .replaceAll(RegExp(r'\s+'), ' ')
      .trim();
  return cleaned.isEmpty ? fileName : cleaned;
}

/// Joins the non-empty parts of an adult metadata line ("studio · quality").
String adultMetadataLine(List<String?> parts) {
  return parts
      .map((value) => value?.trim())
      .whereType<String>()
      .where((value) => value.isNotEmpty)
      .join(' · ');
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

/// One watched-but-undecided item of the Adult retention queue
/// (`GET /api/adult/decisions`), newest `lastPlayedAt` first.
class AdultDecisionCandidate {
  const AdultDecisionCandidate({
    required this.id,
    required this.fileName,
    this.title,
    this.studio,
    this.quality,
    this.isWatched = false,
    this.lastPlayedAt,
    this.sizeBytes = 0,
    this.keep = false,
    this.decidedAt,
    this.thumbUrl,
  });

  final int id;
  final String fileName;
  final String? title;
  final String? studio;
  final String? quality;
  final bool isWatched;
  final DateTime? lastPlayedAt;
  final int sizeBytes;
  final bool keep;
  final DateTime? decidedAt;

  /// Server-relative still, when the list row carries one.
  final String? thumbUrl;

  String get displayTitle => adultDisplayTitle(title, fileName);

  String get subtitleLine => adultMetadataLine([studio, quality]);

  factory AdultDecisionCandidate.fromJson(Map<String, dynamic> json) {
    return AdultDecisionCandidate(
      id: json['id'] as int,
      fileName: json['fileName'] as String? ?? '',
      title: json['title'] as String?,
      studio: json['studio'] as String?,
      quality: json['quality'] as String?,
      isWatched: json['isWatched'] as bool? ?? false,
      lastPlayedAt: _parseAdultTimestamp(json['lastPlayedAt']),
      sizeBytes: (json['sizeBytes'] as num?)?.toInt() ?? 0,
      keep: json['keep'] as bool? ?? false,
      decidedAt: _parseAdultTimestamp(json['decidedAt']),
      thumbUrl: json['thumbUrl'] as String?,
    );
  }
}

/// The watched-but-undecided list (`GET /api/adult/decisions`).
class AdultDecisions {
  const AdultDecisions({this.items = const [], this.total = 0});

  final List<AdultDecisionCandidate> items;
  final int total;

  bool get isEmpty => items.isEmpty;

  factory AdultDecisions.fromJson(Map<String, dynamic> json) {
    final rawItems = json['items'] as List<dynamic>? ?? const [];
    final items = rawItems
        .map((item) => AdultDecisionCandidate.fromJson(item as Map<String, dynamic>))
        .toList();
    return AdultDecisions(
      items: items,
      total: (json['total'] as num?)?.toInt() ?? items.length,
    );
  }
}

/// What the server recorded for one decision (`POST /api/adult/items/:id/decision`).
///
/// `delete` physically quarantines and purges the file, so `deleted`/`alreadyDecided` must be
/// surfaced to the viewer: a silent no-op looks like a failure.
class AdultDecisionResult {
  const AdultDecisionResult({
    required this.id,
    required this.decision,
    this.kept = false,
    this.deleted = false,
    this.alreadyDecided = false,
  });

  final int id;

  /// `keep` or `delete`, echoed by the server.
  final String decision;
  final bool kept;
  final bool deleted;

  /// The item already carried this decision; the call was a no-op.
  final bool alreadyDecided;

  bool get isDelete => decision == 'delete';

  factory AdultDecisionResult.fromJson(Map<String, dynamic> json) {
    return AdultDecisionResult(
      id: (json['id'] as num?)?.toInt() ?? 0,
      decision: json['decision'] as String? ?? '',
      kept: _asDecisionFlag(json['kept']),
      deleted: _asDecisionFlag(json['deleted']),
      alreadyDecided: _asDecisionFlag(json['alreadyDecided']),
    );
  }
}

/// Tolerates the server reporting a flag as a boolean, a non-empty path/id, or a count.
bool _asDecisionFlag(dynamic value) {
  if (value == null) return false;
  if (value is bool) return value;
  if (value is num) return value != 0;
  if (value is String) return value.isNotEmpty;
  if (value is Map) return value.isNotEmpty;
  if (value is List) return value.isNotEmpty;
  return true;
}

DateTime? _parseAdultTimestamp(dynamic value) {
  if (value is String) return DateTime.tryParse(value);
  if (value is num) {
    // Milliseconds since epoch (the server stores timestamps either way).
    return DateTime.fromMillisecondsSinceEpoch(value.toInt());
  }
  return null;
}
