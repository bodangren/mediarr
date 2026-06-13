import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/shared/models/episode.dart';
import 'package:mediarr_client/shared/models/season.dart';
import 'package:mediarr_client/shared/models/series.dart';

/// Artifact contract: `GET /api/series/:id` response shape parsed by the Flutter
/// client.
///
/// Source of truth: `server/src/api/routes/seriesRoutes.ts:332-499` returns
/// `sendSuccess(reply, augmentedRecord)` where `augmentedRecord` includes:
///   - the Prisma series row + nested `seasons[].episodes[]`
///   - `seasons[].statistics` (per-season aggregates)
///   - per-episode `hasFile`, `isDownloading`, `playbackState`
///   - series-level `statistics` aggregate
///
/// The Flutter [Series.fromJson] → [Season.fromJson] → [Episode.fromJson] chain
/// must parse this envelope without throwing, and the fields listed below are
/// the contract surface Phase 4 `EpisodeList` / `SeriesDetailScreen` depend on.
void main() {
  group('Series response contract (GET /api/series/:id)', () {
    test('parses series-level statistics + sizeOnDisk', () {
      final series = Series.fromJson(<String, dynamic>{
        'id': 1,
        'title': 'Breaking Bad',
        'year': 2008,
        'monitored': true,
        'status': 'ended',
        'network': 'AMC',
        'sizeOnDisk': 90000000000,
        'statistics': {
          'totalEpisodes': 62,
          'episodesOnDisk': 62,
          'episodesMissing': 0,
          'episodesDownloading': 0,
          'watchedEpisodes': 50,
          'inProgressEpisodes': 4,
        },
        'seasons': <Map<String, dynamic>>[],
      });

      expect(series.id, 1);
      expect(series.title, 'Breaking Bad');
      expect(series.year, 2008);
      expect(series.monitored, true);
      expect(series.status, 'ended');
      expect(series.network, 'AMC');
      expect(series.sizeOnDisk, 90000000000);
      expect(series.statistics, isNotNull);
      expect(series.statistics!['totalEpisodes'], 62);
      expect(series.statistics!['watchedEpisodes'], 50);
    });

    test('parses nested season with episodes + per-season statistics', () {
      final season = Season.fromJson(<String, dynamic>{
        'id': 11,
        'seasonNumber': 1,
        'monitored': true,
        'episodeCount': 7,
        'episodeFileCount': 7,
        'sizeOnDisk': 10000000000,
        'statistics': {
          'totalEpisodes': 7,
          'episodesOnDisk': 7,
          'episodesMissing': 0,
          'episodesDownloading': 0,
          'watchedEpisodes': 7,
          'inProgressEpisodes': 0,
        },
        'episodes': [
          <String, dynamic>{
            'id': 101,
            'seasonNumber': 1,
            'episodeNumber': 1,
            'title': 'Pilot',
            'airDateUtc': '2008-01-20T00:00:00Z',
            'hasFile': true,
            'monitored': true,
            'isDownloading': false,
            'quality': 'Bluray-1080p',
            'playbackState': {
              'position': 3600,
              'duration': 3600,
              'isWatched': true,
            },
          },
          <String, dynamic>{
            'id': 102,
            'seasonNumber': 1,
            'episodeNumber': 2,
            'title': "Cat's in the Bag...",
            'airDateUtc': '2008-01-27T00:00:00Z',
            'hasFile': true,
            'monitored': true,
            'isDownloading': false,
            'quality': 'Bluray-1080p',
          },
        ],
      });

      expect(season.id, 11);
      expect(season.seasonNumber, 1);
      expect(season.monitored, true);
      expect(season.episodeCount, 7);
      expect(season.episodeFileCount, 7);
      expect(season.episodes, hasLength(2));

      // Episode contract surface that Phase 4 EpisodeList will render:
      final pilot = season.episodes.first;
      expect(pilot.id, 101);
      expect(pilot.seasonNumber, 1);
      expect(pilot.episodeNumber, 1);
      expect(pilot.title, 'Pilot');
      expect(pilot.hasFile, true);
      expect(pilot.monitored, true);
      expect(pilot.isDownloading, false);
      expect(pilot.quality, 'Bluray-1080p');
      expect(pilot.playbackState, isNotNull);
      expect(pilot.playbackState!.position, 3600);
      expect(pilot.playbackState!.isWatched, true);
    });

    test('parses full server envelope (series -> seasons -> episodes)', () {
      final series = Series.fromJson(<String, dynamic>{
        'id': 5,
        'title': 'Severance',
        'year': 2022,
        'monitored': true,
        'seasons': [
          <String, dynamic>{
            'id': 50,
            'seasonNumber': 1,
            'monitored': true,
            'episodes': [
              <String, dynamic>{
                'id': 501,
                'seasonNumber': 1,
                'episodeNumber': 1,
                'title': 'Good News About Hell',
                'hasFile': true,
                'monitored': true,
              },
            ],
            'statistics': <String, dynamic>{
              'totalEpisodes': 9,
              'episodesOnDisk': 9,
            },
          },
          <String, dynamic>{
            'id': 51,
            'seasonNumber': 2,
            'monitored': true,
            'episodes': [
              <String, dynamic>{
                'id': 502,
                'seasonNumber': 2,
                'episodeNumber': 1,
                'title': 'Hello, Ms. Cobel',
                'hasFile': false,
                'monitored': true,
              },
            ],
            'statistics': <String, dynamic>{
              'totalEpisodes': 10,
              'episodesOnDisk': 0,
            },
          },
        ],
        'statistics': <String, dynamic>{
          'totalEpisodes': 19,
          'episodesOnDisk': 9,
          'episodesMissing': 10,
        },
      });

      expect(series.seasons, hasLength(2));
      expect(series.seasons.first.seasonNumber, 1);
      expect(series.seasons.first.episodes.single.title, 'Good News About Hell');
      expect(series.seasons.last.seasonNumber, 2);
      expect(series.seasons.last.episodes.single.hasFile, false);
      expect(series.statistics!['episodesMissing'], 10);
    });

    test('survives missing seasons and statistics without throwing', () {
      final series = Series.fromJson(<String, dynamic>{
        'id': 9,
        'title': 'Bare Series',
      });

      expect(series.id, 9);
      expect(series.title, 'Bare Series');
      expect(series.seasons, isEmpty);
      expect(series.statistics, isNull);
    });
  });

  group('Episode playbackState shape', () {
    test('parses partial playback state with defaults', () {
      final ep = Episode.fromJson(<String, dynamic>{
        'id': 1,
        'seasonNumber': 1,
        'episodeNumber': 1,
      });

      expect(ep.title, isNull);
      expect(ep.hasFile, false);
      expect(ep.monitored, false);
      expect(ep.isDownloading, false);
      expect(ep.quality, isNull);
      expect(ep.playbackState, isNull);
    });
  });
}