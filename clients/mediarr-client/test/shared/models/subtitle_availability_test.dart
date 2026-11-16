import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/shared/models/episode.dart';
import 'package:mediarr_client/shared/models/library_item.dart';
import 'package:mediarr_client/shared/models/movie.dart';
import 'package:mediarr_client/shared/models/series.dart';
import 'package:mediarr_client/shared/models/subtitle_availability.dart';

void main() {
  group('SubtitleAvailability.fromJson', () {
    test('parses the server object', () {
      expect(
        SubtitleAvailability.fromJson(<String, dynamic>{
          'zh': true,
          'en': false,
        }),
        const SubtitleAvailability(zh: true, en: false),
      );
      expect(
        SubtitleAvailability.fromJson(<String, dynamic>{
          'zh': true,
          'en': true,
        }),
        const SubtitleAvailability(zh: true, en: true),
      );
    });

    test('defaults to none when an older server omits the field', () {
      expect(SubtitleAvailability.fromJson(null), SubtitleAvailability.none);
      expect(
        SubtitleAvailability.fromJson(<String, dynamic>{}),
        SubtitleAvailability.none,
      );
    });

    test('does not throw on an unexpected (non-map) value', () {
      expect(
        SubtitleAvailability.fromJson('unexpected'),
        SubtitleAvailability.none,
      );
      expect(SubtitleAvailability.fromJson(42), SubtitleAvailability.none);
    });

    test('builds the FR-5 badge labels', () {
      expect(const SubtitleAvailability(zh: true, en: true).badgeLabel, '中英');
      expect(const SubtitleAvailability(zh: true).badgeLabel, '中文');
      expect(const SubtitleAvailability(en: true).badgeLabel, 'EN');
      expect(SubtitleAvailability.none.badgeLabel, isNull);
      expect(SubtitleAvailability.none.hasAny, isFalse);
    });
  });

  group('payload parsing', () {
    test('Movie.fromJson parses subtitleAvailability', () {
      final movie = Movie.fromJson(<String, dynamic>{
        'id': 1,
        'title': 'Dual Subs',
        'subtitleAvailability': <String, dynamic>{'zh': true, 'en': true},
      });
      expect(
        movie.subtitleAvailability,
        const SubtitleAvailability(zh: true, en: true),
      );
    });

    test('Movie.fromJson defaults to none for an older server payload', () {
      final movie = Movie.fromJson(<String, dynamic>{
        'id': 2,
        'title': 'Old Server',
      });
      expect(movie.subtitleAvailability, SubtitleAvailability.none);
    });

    test('Episode.fromJson parses per-episode subtitleAvailability', () {
      final episode = Episode.fromJson(<String, dynamic>{
        'id': 10,
        'seasonNumber': 1,
        'episodeNumber': 1,
        'subtitleAvailability': <String, dynamic>{'zh': true, 'en': false},
      });
      expect(
        episode.subtitleAvailability,
        const SubtitleAvailability(zh: true, en: false),
      );
    });

    test('Episode.fromJson defaults to none for an older server payload', () {
      final episode = Episode.fromJson(<String, dynamic>{
        'id': 11,
        'seasonNumber': 1,
        'episodeNumber': 2,
      });
      expect(episode.subtitleAvailability, SubtitleAvailability.none);
    });

    test('Series.fromJson parses the series-level roll-up and episodes', () {
      final series = Series.fromJson(<String, dynamic>{
        'id': 5,
        'title': 'My Show',
        'subtitleAvailability': <String, dynamic>{'zh': true, 'en': true},
        'seasons': [
          <String, dynamic>{
            'id': 1,
            'seasonNumber': 1,
            'episodes': [
              <String, dynamic>{
                'id': 100,
                'seasonNumber': 1,
                'episodeNumber': 1,
                'subtitleAvailability': <String, dynamic>{
                  'zh': true,
                  'en': false,
                },
              },
            ],
          },
        ],
      });
      expect(
        series.subtitleAvailability,
        const SubtitleAvailability(zh: true, en: true),
      );
      expect(
        series.seasons.first.episodes.first.subtitleAvailability,
        const SubtitleAvailability(zh: true, en: false),
      );
    });

    test(
      'Series.fromJson defaults to none when a list payload omits the roll-up',
      () {
        final series = Series.fromJson(<String, dynamic>{
          'id': 6,
          'title': 'Old Server',
        });
        expect(series.subtitleAvailability, SubtitleAvailability.none);
      },
    );

    test(
      'LibraryItem leaves availability unknown when the endpoint omits it',
      () {
        final item = LibraryItem.fromJson(<String, dynamic>{
          'id': 1,
          'title': 'Alien',
          'type': 'movie',
        });
        expect(item.subtitleAvailability, isNull);
      },
    );

    test('LibraryItem parses availability when the payload carries it', () {
      final item = LibraryItem.fromJson(<String, dynamic>{
        'id': 2,
        'title': 'Aliens',
        'type': 'movie',
        'subtitleAvailability': <String, dynamic>{'zh': false, 'en': true},
      });
      expect(item.subtitleAvailability, const SubtitleAvailability(en: true));
    });
  });
}
