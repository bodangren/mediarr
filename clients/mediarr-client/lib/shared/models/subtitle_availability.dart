/// Server-truth Chinese/English subtitle availability for one item.
///
/// Mirrors the additive `subtitleAvailability` object the server now returns on
/// movie list, movie detail and series detail (per episode) payloads:
///
/// ```json
/// { "subtitleAvailability": { "zh": true, "en": false } }
/// ```
///
/// The badge must never be guessed from a filename at render time, so parsers
/// default to [none] when an older server omits the field: a missing field can
/// never throw.
class SubtitleAvailability {
  const SubtitleAvailability({this.zh = false, this.en = false});

  /// No known subtitle for either language (also the safe default for payloads
  /// that predate the field).
  static const none = SubtitleAvailability();

  /// A Chinese subtitle (`zho`/`chi`/`zh`/`cmn`) exists for the item.
  final bool zh;

  /// An English subtitle (`en`/`eng`) exists for the item.
  final bool en;

  bool get hasAny => zh || en;

  /// Badge label the detail screens use: `中英`, `中文`, `EN`, or null.
  ///
  /// Null means the client should render a missing marker instead of a language
  /// label. Callers decide the visual per spec FR-5.
  String? get badgeLabel {
    if (zh && en) return '中英';
    if (zh) return '中文';
    if (en) return 'EN';
    return null;
  }

  factory SubtitleAvailability.fromJson(Object? json) {
    if (json is! Map) return none;
    return SubtitleAvailability(zh: json['zh'] == true, en: json['en'] == true);
  }

  Map<String, dynamic> toJson() => {'zh': zh, 'en': en};

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is SubtitleAvailability && other.zh == zh && other.en == en;

  @override
  int get hashCode => Object.hash(zh, en);

  @override
  String toString() => 'SubtitleAvailability(zh: $zh, en: $en)';
}
