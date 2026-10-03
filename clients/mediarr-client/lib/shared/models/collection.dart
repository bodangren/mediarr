import 'package:flutter/foundation.dart';

/// A movie collection as returned by `GET /api/collections` (FR-4).
///
/// The server already serves this endpoint and the web UI already manages
/// collections, so the TV client only reads them.
@immutable
class MediaCollection {
  const MediaCollection({
    required this.id,
    required this.name,
    this.overview,
    this.posterUrl,
    this.backdropUrl,
    this.movieCount = 0,
    this.moviesInLibrary = 0,
  });

  final int id;
  final String name;
  final String? overview;
  final String? posterUrl;
  final String? backdropUrl;

  /// Total movies in the collection.
  final int movieCount;

  /// How many of them are actually in the library. This is the number a
  /// viewer cares about.
  final int moviesInLibrary;

  factory MediaCollection.fromJson(Map<String, dynamic> json) {
    return MediaCollection(
      id: (json['id'] as num?)?.toInt() ?? 0,
      name: json['name'] as String? ?? '',
      overview: json['overview'] as String?,
      posterUrl: json['posterUrl'] as String?,
      backdropUrl: json['backdropUrl'] as String?,
      movieCount: (json['movieCount'] as num?)?.toInt() ?? 0,
      moviesInLibrary: (json['moviesInLibrary'] as num?)?.toInt() ?? 0,
    );
  }
}

/// One movie inside a collection, from `GET /api/collections/:id` (FR-4).
@immutable
class CollectionMovie {
  const CollectionMovie({
    required this.id,
    required this.title,
    this.year,
    this.overview,
    this.posterUrl,
    this.inLibrary = false,
    this.quality,
  });

  final int id;
  final String title;
  final int? year;
  final String? overview;
  final String? posterUrl;

  /// False means the movie is part of the collection but not downloaded.
  final bool inLibrary;
  final String? quality;

  factory CollectionMovie.fromJson(Map<String, dynamic> json) {
    return CollectionMovie(
      id: (json['id'] as num?)?.toInt() ?? 0,
      title: json['title'] as String? ?? '',
      year: (json['year'] as num?)?.toInt(),
      overview: json['overview'] as String?,
      posterUrl: json['posterUrl'] as String?,
      inLibrary: json['inLibrary'] as bool? ?? false,
      quality: json['quality'] as String?,
    );
  }
}