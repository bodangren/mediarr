import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/shared/models/adult_item.dart';

void main() {
  group('AdultItem', () {
    test('parses a resolved item and builds its subtitle line', () {
      final item = AdultItem.fromJson({
        'id': 9,
        'fileName': '1000Facials - Best Asian Babes [hash].mp4',
        'path': '/data/Porn/1000Facials - Best Asian Babes [hash].mp4',
        'sizeBytes': 264237135,
        'title': 'Best Asian Babes Blowjobs Compilation',
        'studio': '1000Facials',
        'quality': '1080p',
        'releaseDate': null,
        'needsReview': false,
      });

      expect(item.displayTitle, 'Best Asian Babes Blowjobs Compilation');
      expect(item.subtitleLine, '1000Facials · 1080p');
      expect(item.needsReview, isFalse);
    });

    test('falls back to the filename for a review-bucket item', () {
      final item = AdultItem.fromJson({
        'id': 1,
        'fileName': '004 [1c6d5a2b].mp4',
        'path': '/data/Porn/004 [1c6d5a2b].mp4',
        'sizeBytes': 10,
        'title': null,
        'needsReview': true,
      });

      expect(item.displayTitle, '004 [1c6d5a2b].mp4');
      expect(item.subtitleLine, '');
      expect(item.needsReview, isTrue);
    });

    test('tolerates missing optional fields', () {
      final item = AdultItem.fromJson({'id': 5});
      expect(item.id, 5);
      expect(item.displayTitle, '');
      expect(item.sizeBytes, 0);
      expect(item.needsReview, isFalse);
    });
  });
}
