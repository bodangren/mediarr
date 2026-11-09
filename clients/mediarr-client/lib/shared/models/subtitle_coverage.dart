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
