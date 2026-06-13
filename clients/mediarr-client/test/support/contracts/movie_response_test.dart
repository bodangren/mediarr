import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/shared/models/movie.dart';

/// Artifact contract: `GET /api/movies/:id` response shape parsed by the Flutter
/// client.
///
/// Source of truth: `server/src/api/routes/movieRoutes.ts:210-279` returns
/// `sendSuccess(reply, { ...movie, sizeOnDisk, collection, playbackState })`
/// where `movie` is the Prisma `Movie` row (see `server/src/db/schema.ts:140-170`).
/// The Flutter adapter [Movie.fromJson] must not throw on this envelope, and
/// must preserve every field the existing [MovieDetailScreen] renders
/// (Phase 3 still depends on these flat fields).
void main() {
  group('Movie response contract (GET /api/movies/:id)', () {
    test('parses minimal server envelope without throwing', () {
      final movie = Movie.fromJson(<String, dynamic>{
        'id': 42,
        'title': 'Inception',
      });

      expect(movie.id, 42);
      expect(movie.title, 'Inception');
      expect(movie.year, isNull);
      expect(movie.overview, isNull);
      expect(movie.posterUrl, isNull);
      expect(movie.fanartUrl, isNull);
      expect(movie.monitored, false);
      expect(movie.hasFile, false);
      expect(movie.quality, isNull);
      expect(movie.sizeOnDisk, isNull);
      expect(movie.runtime, isNull);
      expect(movie.path, isNull);
    });

    test('parses full server envelope with file + collection + playbackState', () {
      final raw = <String, dynamic>{
        'id': 7,
        'mediaId': 7,
        'tmdbId': 27205,
        'imdbId': 'tt1375666',
        'title': 'Inception',
        'cleanTitle': 'inception',
        'sortTitle': 'inception',
        'status': 'released',
        'overview': 'A thief who steals corporate secrets...',
        'monitored': true,
        'qualityProfileId': 1,
        'qualityProfileName': 'HD-1080p',
        'path': '/media/movies/Inception (2010)/Inception.mkv',
        'year': 2010,
        'posterUrl': 'https://image.tmdb.org/t/p/w500/poster.jpg',
        'runtime': 148,
        'added': '2026-01-01T00:00:00Z',
        'minimumAvailability': 'released',
        'fileVariants': [
          {
            'id': 1,
            'mediaType': 'MOVIE',
            'movieId': 7,
            'filePath': '/media/movies/Inception (2010)/Inception.mkv',
            'fileSize': 15000000000,
            'quality': 'Bluray-1080p',
            'audioTracks': <Map<String, dynamic>>[],
            'subtitleTracks': <Map<String, dynamic>>[],
            'missingSubtitles': <Map<String, dynamic>>[],
          },
        ],
        'collection': {
          'id': 10,
          'name': 'Inception Collection',
          'posterUrl': 'https://image.tmdb.org/t/p/w500/coll.jpg',
        },
        'sizeOnDisk': 15000000000,
        'playbackState': {
          'position': 0,
          'duration': 0,
          'progress': 0.0,
          'isWatched': false,
          'lastWatched': '2026-01-01T00:00:00Z',
        },
      };

      final movie = Movie.fromJson(raw);

      // Contract fields the current MovieDetailScreen renders:
      expect(movie.id, 7);
      expect(movie.title, 'Inception');
      expect(movie.year, 2010);
      expect(movie.overview, startsWith('A thief'));
      expect(movie.posterUrl, 'https://image.tmdb.org/t/p/w500/poster.jpg');
      expect(movie.monitored, true);
      expect(movie.path, '/media/movies/Inception (2010)/Inception.mkv');
      expect(movie.runtime, 148);
      // quality/sizeOnDisk/hasFile are flat fields the UI uses, but the server
      // returns quality via fileVariants[].quality and sizeOnDisk at top level.
      // The current Movie model does NOT derive hasFile from fileVariants — that
      // is a known gap tracked in tech-debt for Phase 3 to handle.
      expect(movie.sizeOnDisk, 15000000000);
      expect(movie.quality, isNull);
      expect(movie.hasFile, isFalse);
    });

    test('survives extra/unknown fields without throwing', () {
      // Forward compatibility: server may add new keys (e.g. certifications,
      // studio, genres) without forcing a Flutter client release.
      final movie = Movie.fromJson(<String, dynamic>{
        'id': 99,
        'title': 'Tenet',
        'studio': 'Warner Bros.',
        'genres': ['Action', 'Sci-Fi'],
        'certification': 'PG-13',
        'backdropUrl': 'https://image.tmdb.org/t/p/original/x.jpg',
      });

      expect(movie.id, 99);
      expect(movie.title, 'Tenet');
      expect(movie.year, isNull);
      expect(movie.monitored, false);
    });
  });
}