import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/shared/models/episode.dart';
import 'package:mediarr_client/shared/models/media_file_variant.dart';

void main() {
  group('Episode.effectiveHasFile', () {
    test('is true when hasFile is true', () {
      const episode = Episode(
        id: 1,
        seasonNumber: 1,
        episodeNumber: 1,
        hasFile: true,
      );
      expect(episode.effectiveHasFile, isTrue);
    });

    test('is true when hasFile is false but path is non-empty', () {
      const episode = Episode(
        id: 2,
        seasonNumber: 1,
        episodeNumber: 2,
        hasFile: false,
        path: '/media/shows/s01e02.mkv',
      );
      expect(episode.effectiveHasFile, isTrue);
    });

    test('is true when hasFile is false and fileVariants is non-empty', () {
      const episode = Episode(
        id: 3,
        seasonNumber: 1,
        episodeNumber: 3,
        hasFile: false,
        fileVariants: [MediaFileVariant(path: '/media/shows/s01e03.mkv')],
      );
      expect(episode.effectiveHasFile, isTrue);
    });

    test('is false when no playable signal is present', () {
      const episode = Episode(
        id: 4,
        seasonNumber: 1,
        episodeNumber: 4,
        hasFile: false,
      );
      expect(episode.effectiveHasFile, isFalse);
    });
  });
}
