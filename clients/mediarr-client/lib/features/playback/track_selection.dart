/// Pure language matching + default-track selection for playback.
///
/// FR-6 contract:
///   - English audio = ISO 639-2 `eng` (exact and prefixed match).
///   - Chinese Simplified subtitles = `zho`, `chi`, or any tag containing
///     `zh-Hans`, `chs`, or `sc` (exact and prefixed match).
///   - Fallbacks: no English audio → first audio track. No Chinese sub → no
///     subtitle (do NOT fall back to another subtitle language silently).
///
/// Kept side-effect free so it can be tested directly and re-used by both the
/// server-side ranking and the client-side defensive selection.
library;

/// Lightweight audio track description used by the default-selection logic.
/// The Flutter player does not have a richer audio-track model than
/// `id` + `language` + `title`, so this struct carries exactly those three
/// fields.
class AudioTrackInfo {
  const AudioTrackInfo({required this.id, this.language, this.title});

  final String id;
  final String? language;
  final String? title;

  @override
  bool operator ==(Object other) =>
      other is AudioTrackInfo &&
      other.id == id &&
      other.language == language &&
      other.title == title;

  @override
  int get hashCode => Object.hash(id, language, title);

  @override
  String toString() =>
      'AudioTrackInfo(id: $id, language: $language, title: $title)';
}

/// Lightweight subtitle track description used by the default-selection logic.
class SubtitleTrackInfo {
  const SubtitleTrackInfo({required this.id, this.language, this.title});

  final String id;
  final String? language;
  final String? title;

  @override
  bool operator ==(Object other) =>
      other is SubtitleTrackInfo &&
      other.id == id &&
      other.language == language &&
      other.title == title;

  @override
  int get hashCode => Object.hash(id, language, title);

  @override
  String toString() =>
      'SubtitleTrackInfo(id: $id, language: $language, title: $title)';
}

/// Builds a stable client track ID for an external subtitle manifest entry.
String externalSubtitleTrackId(int manifestId) => 'external:$manifestId';

/// Combines container tracks with manifest subtitle tracks.
///
/// External tracks take precedence when the media backend also reports the
/// same loaded track. The manifest ID remains stable for picker selection.
List<SubtitleTrackInfo> mergeSubtitleTracks(
  List<SubtitleTrackInfo> containerTracks,
  List<SubtitleTrackInfo> externalTracks,
) {
  final externalKeys = externalTracks.map(_subtitleTrackKey).toSet();
  return [
    ...containerTracks.where(
      (track) => !externalKeys.contains(_subtitleTrackKey(track)),
    ),
    ...externalTracks,
  ];
}

String _subtitleTrackKey(SubtitleTrackInfo track) =>
    '${track.language?.trim().toLowerCase() ?? ''}\u0000'
    '${track.title?.trim().toLowerCase() ?? ''}';

/// Returns `true` when [language] matches the English ISO 639-2 code `eng`.
///
/// Accepts exact match (`eng`) and any prefix that starts with `eng` (e.g.
/// `eng-us`, `english`), case-insensitive. Empty / null returns `false`.
bool isEnglishAudio(String? language) {
  if (language == null) return false;
  final normalized = language.trim().toLowerCase();
  if (normalized.isEmpty) return false;
  if (normalized == 'eng') return true;
  return normalized.startsWith('eng');
}

/// Returns `true` when [language] matches Chinese Simplified.
///
/// Accepts:
///   - ISO 639-2/B `zho` (exact or prefixed)
///   - ISO 639-2/T `chi` (exact or prefixed)
///   - BCP-47 tags containing `zh-hans` (Simplified Chinese)
///   - tags containing `chs` (older Windows-style code for Simplified)
///   - tags containing `sc` as a hyphen-separated subtag (e.g. `zh-sc`)
/// Empty / null returns `false`.
bool isChineseSimplified(String? language) {
  if (language == null) return false;
  final normalized = language.trim().toLowerCase();
  if (normalized.isEmpty) return false;

  if (normalized == 'zho' || normalized == 'chi') return true;
  if (normalized.startsWith('zho') || normalized.startsWith('chi')) return true;
  if (normalized.contains('zh-hans')) return true;
  if (normalized.contains('chs')) return true;
  if (_hasSubtag(normalized, 'sc')) return true;

  return false;
}

/// Returns `true` if [normalized] contains `sc` as a hyphen-separated subtag.
bool _hasSubtag(String normalized, String tag) {
  for (final part in normalized.split('-')) {
    if (part == tag) return true;
  }
  return false;
}

/// Select the default audio track index from [audios].
///
/// Selection rules:
///   1. First track whose [AudioTrackInfo.language] matches [isEnglishAudio].
///   2. Otherwise the first track (so playback always has audio).
///   3. Returns `null` only when [audios] is empty.
int? selectDefaultAudioTrackIndex(List<AudioTrackInfo> audios) {
  if (audios.isEmpty) return null;
  for (var i = 0; i < audios.length; i++) {
    if (isEnglishAudio(audios[i].language)) return i;
  }
  return 0;
}

/// Select the default subtitle track index from [subs].
///
/// Selection rules:
///   1. First track whose [SubtitleTrackInfo.language] matches
///      [isChineseSimplified].
///   2. Otherwise `null` (no subtitle). The brief is explicit: do NOT fall
///      back to another subtitle language silently.
int? selectDefaultSubtitleTrackIndex(List<SubtitleTrackInfo> subs) {
  for (var i = 0; i < subs.length; i++) {
    if (isChineseSimplified(subs[i].language)) return i;
  }
  return null;
}
