/// One server-side library search hit (`GET /api/library/search`).
class LibrarySearchItem {
  const LibrarySearchItem({
    required this.type,
    required this.id,
    required this.title,
    this.year,
    this.posterUrl,
    this.subtitle,
    this.seriesId,
    this.seasonNumber,
    this.episodeNumber,
  });

  final String type; // movie | series | episode
  final int id;
  final String title;
  final int? year;
  final String? posterUrl;
  final String? subtitle;
  final int? seriesId;
  final int? seasonNumber;
  final int? episodeNumber;

  bool get isMovie => type == 'movie';
  bool get isSeries => type == 'series';
  bool get isEpisode => type == 'episode';

  String get episodeLabel {
    if (!isEpisode || seasonNumber == null || episodeNumber == null) return '';
    final season = seasonNumber!.toString().padLeft(2, '0');
    final episode = episodeNumber!.toString().padLeft(2, '0');
    return 'S$season' 'E$episode';
  }

  factory LibrarySearchItem.fromJson(Map<String, dynamic> json) => LibrarySearchItem(
        type: json['type'] as String? ?? 'movie',
        id: (json['id'] as num).toInt(),
        title: json['title'] as String? ?? '',
        year: (json['year'] as num?)?.toInt(),
        posterUrl: json['posterUrl'] as String?,
        subtitle: json['subtitle'] as String?,
        seriesId: (json['seriesId'] as num?)?.toInt(),
        seasonNumber: (json['seasonNumber'] as num?)?.toInt(),
        episodeNumber: (json['episodeNumber'] as num?)?.toInt(),
      );
}
