class SearchResult {
  const SearchResult({
    required this.tmdbId,
    required this.tvdbId,
    required this.title,
    this.year,
    this.overview,
    this.posterUrl,
    this.mediaType,
  });

  final int tmdbId;
  final int tvdbId;
  final String title;
  final int? year;
  final String? overview;
  final String? posterUrl;
  final String mediaType;

  factory SearchResult.fromJson(Map<String, dynamic> json) {
    return SearchResult(
      tmdbId: json['tmdbId'] as int? ?? 0,
      tvdbId: json['tvdbId'] as int? ?? 0,
      title: json['title'] as String? ?? 'Unknown',
      year: json['year'] as int?,
      overview: json['overview'] as String?,
      posterUrl: json['posterUrl'] as String?,
      mediaType: json['mediaType'] as String? ?? 'movie',
    );
  }

  bool get isMovie => mediaType.toLowerCase() == 'movie';
  bool get isSeries => mediaType.toLowerCase() == 'series' || mediaType.toLowerCase() == 'tv';
}

class Release {
  const Release({
    required this.guid,
    required this.indexerId,
    required this.title,
    required this.size,
    required this.seeders,
    this.leechers,
    this.quality,
    this.indexerName,
    this.age,
    this.downloadUrl,
    this.magnetUrl,
  });

  final String guid;
  final int indexerId;
  final String title;
  final int size;
  final int seeders;
  final int? leechers;
  final String? quality;
  final String? indexerName;
  final int? age;
  final String? downloadUrl;
  final String? magnetUrl;

  factory Release.fromJson(Map<String, dynamic> json) {
    return Release(
      guid: json['guid'] as String? ?? '',
      indexerId: json['indexerId'] as int? ?? 0,
      title: json['title'] as String? ?? '',
      size: json['size'] as int? ?? 0,
      seeders: json['seeders'] as int? ?? 0,
      leechers: json['leechers'] as int?,
      quality: json['quality'] as String?,
      indexerName: json['indexerName'] as String?,
      age: json['age'] as int?,
      downloadUrl: json['downloadUrl'] as String?,
      magnetUrl: json['magnetUrl'] as String?,
    );
  }

  String get sizeFormatted {
    if (size < 1024) return '$size B';
    if (size < 1024 * 1024) return '${(size / 1024).toStringAsFixed(1)} KB';
    if (size < 1024 * 1024 * 1024) return '${(size / (1024 * 1024)).toStringAsFixed(1)} MB';
    return '${(size / (1024 * 1024 * 1024)).toStringAsFixed(2)} GB';
  }
}