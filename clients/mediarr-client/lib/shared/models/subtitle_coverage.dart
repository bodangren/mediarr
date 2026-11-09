/// Subtitle coverage for the viewing-priority buckets, as reported by `/api/subtitles/coverage`.
///
/// The TV screen shows this so the "watching list has no dual-language subtitles" problem is visible
/// in the living room, with the same numbers the SPA and the server use.
class SubtitleCoverageBucket {
  const SubtitleCoverageBucket({
    required this.bucket,
    required this.total,
    required this.withBoth,
    required this.missingChinese,
    required this.missingBoth,
  });

  factory SubtitleCoverageBucket.fromJson(Map<String, dynamic> json) {
    int asInt(String key) => (json[key] as num?)?.toInt() ?? 0;
    return SubtitleCoverageBucket(
      bucket: json['bucket'] as String? ?? 'unknown',
      total: asInt('total'),
      withBoth: asInt('withBoth'),
      missingChinese: asInt('missingChinese'),
      missingBoth: asInt('missingBoth'),
    );
  }

  final String bucket;
  final int total;
  final int withBoth;
  final int missingChinese;
  final int missingBoth;

  String get label => switch (bucket) {
        'continue-watching' => 'Continue watching',
        'recently-watched' => 'Watched recently',
        'recently-added' => 'New',
        'backfill' => 'Backfill',
        _ => bucket,
      };
}

class SubtitleCoverage {
  const SubtitleCoverage({required this.buckets, required this.total, required this.withBoth});

  factory SubtitleCoverage.fromJson(Map<String, dynamic> json) {
    final buckets = (json['buckets'] as List<dynamic>? ?? const [])
        .whereType<Map<String, dynamic>>()
        .map(SubtitleCoverageBucket.fromJson)
        .toList();
    final totals = json['totals'] as Map<String, dynamic>? ?? const {};
    return SubtitleCoverage(
      buckets: buckets,
      total: (totals['total'] as num?)?.toInt() ?? 0,
      withBoth: (totals['withBoth'] as num?)?.toInt() ?? 0,
    );
  }

  final List<SubtitleCoverageBucket> buckets;
  final int total;
  final int withBoth;
}

/// One viewing-priority item and the honest reason it is (or is not) covered by EN+ZH subtitles.
class PriorityCoverageItem {
  const PriorityCoverageItem({
    required this.mediaType,
    required this.mediaId,
    required this.title,
    required this.status,
    required this.languages,
  });

  factory PriorityCoverageItem.fromJson(Map<String, dynamic> json) {
    return PriorityCoverageItem(
      mediaType: json['mediaType'] as String? ?? '',
      mediaId: (json['mediaId'] as num?)?.toInt() ?? 0,
      title: json['title'] as String? ?? '',
      status: json['status'] as String? ?? 'none',
      languages: (json['languages'] as List<dynamic>? ?? const [])
          .whereType<String>()
          .toList(growable: false),
    );
  }

  final String mediaType;
  final int mediaId;
  final String title;
  final String status;
  final List<String> languages;

  bool get hasBoth => status == 'dual' || status == 'both';

  String get reason => switch (status) {
        'dual' || 'both' => 'EN + ZH',
        'en-only' => 'English only — no Chinese',
        'zh-only' => 'Chinese only — no English',
        'none' => 'No subtitles',
        _ => status,
      };
}

class PriorityCoverage {
  const PriorityCoverage({required this.days, required this.items});

  factory PriorityCoverage.fromJson(Map<String, dynamic> json) {
    return PriorityCoverage(
      days: (json['days'] as num?)?.toInt() ?? 14,
      items: (json['items'] as List<dynamic>? ?? const [])
          .whereType<Map<String, dynamic>>()
          .map(PriorityCoverageItem.fromJson)
          .toList(growable: false),
    );
  }

  final int days;
  final List<PriorityCoverageItem> items;
}
