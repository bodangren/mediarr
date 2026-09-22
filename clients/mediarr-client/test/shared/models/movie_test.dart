import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/shared/models/media_file_variant.dart';
import 'package:mediarr_client/shared/models/movie.dart';

void main() {
  group('Movie.effectiveHasFile', () {
    test('is true when the server sends hasFile true', () {
      const movie = Movie(
        id: 1,
        title: 'HasFile True',
        hasFile: true,
      );
      expect(movie.effectiveHasFile, isTrue);
    });

    test('is true when hasFile is false but path is non-empty', () {
      const movie = Movie(
        id: 2,
        title: 'Has Path',
        hasFile: false,
        path: '/media/movies/has-path.mkv',
      );
      expect(movie.effectiveHasFile, isTrue);
    });

    test('is true when hasFile is false and path is null but fileVariants is non-empty', () {
      const movie = Movie(
        id: 3,
        title: 'Has Variants',
        hasFile: false,
        fileVariants: [MediaFileVariant(path: '/media/movies/variant.mkv')],
      );
      expect(movie.effectiveHasFile, isTrue);
    });

    test('is false when hasFile is false, path is null, and fileVariants is empty', () {
      const movie = Movie(
        id: 4,
        title: 'Missing',
        hasFile: false,
        fileVariants: [],
      );
      expect(movie.effectiveHasFile, isFalse);
    });

    test('is false when hasFile is false and no variants are present', () {
      const movie = Movie(
        id: 5,
        title: 'Missing Too',
        hasFile: false,
      );
      expect(movie.effectiveHasFile, isFalse);
    });
  });

  group('Movie.fromJson effectiveHasFile', () {
    test('derives true from a non-empty fileVariants list', () {
      final movie = Movie.fromJson(<String, dynamic>{
        'id': 6,
        'title': 'Imported',
        'hasFile': false,
        'fileVariants': [
          <String, dynamic>{
            'id': 1,
            'filePath': '/media/movies/imported.mkv',
            'quality': 'WEBDL-1080p',
          },
        ],
      });

      expect(movie.hasFile, isFalse);
      expect(movie.fileVariants, hasLength(1));
      expect(movie.fileVariants?.first.path, '/media/movies/imported.mkv');
      expect(movie.effectiveHasFile, isTrue);
    });

    test('derives true from a non-empty path field', () {
      final movie = Movie.fromJson(<String, dynamic>{
        'id': 7,
        'title': 'Imported With Path',
        'hasFile': false,
        'path': '/media/movies/imported.mkv',
      });

      expect(movie.hasFile, isFalse);
      expect(movie.effectiveHasFile, isTrue);
    });
  });
}
