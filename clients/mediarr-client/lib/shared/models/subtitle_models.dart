/// Represents a subtitle track for a media variant.
class SubtitleTrack {
  const SubtitleTrack({
    required this.source,
    this.languageCode,
    required this.isForced,
    required this.isHi,
    this.filePath,
  });

  final String source;
  final String? languageCode;
  final bool isForced;
  final bool isHi;
  final String? filePath;

  factory SubtitleTrack.fromJson(Map<String, dynamic> json) {
    return SubtitleTrack(
      source: json['source'] as String? ?? 'unknown',
      languageCode: json['languageCode'] as String?,
      isForced: json['isForced'] as bool? ?? false,
      isHi: json['isHi'] as bool? ?? false,
      filePath: json['filePath'] as String?,
    );
  }

  String get displayLanguage {
    if (languageCode == null || languageCode!.isEmpty) return 'Unknown';
    return _languageName(languageCode!);
  }

  String get displayLabel {
    final parts = <String>[displayLanguage];
    if (isForced) parts.add('Forced');
    if (isHi) parts.add('HI');
    return parts.join(' · ');
  }
}

/// Represents a subtitle search result from a provider.
class SubtitleSearchResult {
  const SubtitleSearchResult({
    required this.languageCode,
    required this.isForced,
    required this.isHi,
    required this.provider,
    required this.score,
    this.releaseName,
    this.extension,
  });

  final String languageCode;
  final bool isForced;
  final bool isHi;
  final String provider;
  final double score;
  final String? releaseName;
  final String? extension;

  factory SubtitleSearchResult.fromJson(Map<String, dynamic> json) {
    return SubtitleSearchResult(
      languageCode: json['languageCode'] as String? ?? 'unknown',
      isForced: json['isForced'] as bool? ?? false,
      isHi: json['isHi'] as bool? ?? false,
      provider: json['provider'] as String? ?? 'unknown',
      score: (json['score'] as num?)?.toDouble() ?? 0.0,
      releaseName: json['releaseName'] as String?,
      extension: json['extension'] as String?,
    );
  }

  String get displayLanguage => _languageName(languageCode);

  String get displayLabel {
    final parts = <String>[displayLanguage];
    if (isForced) parts.add('Forced');
    if (isHi) parts.add('HI');
    return parts.join(' · ');
  }
}

/// Represents a media variant's subtitle inventory.
class VariantInventory {
  const VariantInventory({
    required this.variantId,
    required this.path,
    required this.subtitleTracks,
    required this.missingSubtitles,
  });

  final int variantId;
  final String path;
  final List<SubtitleTrack> subtitleTracks;
  final List<MissingSubtitle> missingSubtitles;

  factory VariantInventory.fromJson(Map<String, dynamic> json) {
    return VariantInventory(
      variantId: json['variantId'] as int? ?? 0,
      path: json['path'] as String? ?? '',
      subtitleTracks: (json['subtitleTracks'] as List<dynamic>? ?? [])
          .map((e) => SubtitleTrack.fromJson(e as Map<String, dynamic>))
          .toList(),
      missingSubtitles: (json['missingSubtitles'] as List<dynamic>? ?? [])
          .map((e) => MissingSubtitle.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}

/// Represents a missing subtitle preference.
class MissingSubtitle {
  const MissingSubtitle({
    required this.languageCode,
    required this.isForced,
    required this.isHi,
  });

  final String languageCode;
  final bool isForced;
  final bool isHi;

  factory MissingSubtitle.fromJson(Map<String, dynamic> json) {
    return MissingSubtitle(
      languageCode: json['languageCode'] as String? ?? 'unknown',
      isForced: json['isForced'] as bool? ?? false,
      isHi: json['isHi'] as bool? ?? false,
    );
  }

  String get displayLabel {
    final parts = <String>[_languageName(languageCode)];
    if (isForced) parts.add('Forced');
    if (isHi) parts.add('HI');
    return parts.join(' · ');
  }
}

String _languageName(String code) {
  const map = {
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'ja': 'Japanese',
    'zh': 'Chinese',
    'ko': 'Korean',
    'ar': 'Arabic',
    'hi': 'Hindi',
    'th': 'Thai',
    'pl': 'Polish',
    'tr': 'Turkish',
    'nl': 'Dutch',
    'sv': 'Swedish',
    'da': 'Danish',
    'no': 'Norwegian',
    'fi': 'Finnish',
    'cs': 'Czech',
    'hu': 'Hungarian',
    'el': 'Greek',
    'he': 'Hebrew',
    'id': 'Indonesian',
    'vi': 'Vietnamese',
    'uk': 'Ukrainian',
    'ro': 'Romanian',
  };
  return map[code.toLowerCase()] ?? code.toUpperCase();
}
