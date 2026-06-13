import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/shared/models/subtitle_models.dart';
import 'package:mediarr_client/shared/services/api_client.dart';


void main() {
  group('SubtitleTrack', () {
    test('fromJson parses correctly', () {
      final track = SubtitleTrack.fromJson({
        'source': 'opensubtitles',
        'languageCode': 'en',
        'isForced': false,
        'isHi': true,
        'filePath': '/path/to/sub.srt',
      });
      expect(track.source, 'opensubtitles');
      expect(track.languageCode, 'en');
      expect(track.isForced, false);
      expect(track.isHi, true);
      expect(track.filePath, '/path/to/sub.srt');
    });

    test('fromJson handles nulls', () {
      final track = SubtitleTrack.fromJson({
        'source': 'embedded',
      });
      expect(track.source, 'embedded');
      expect(track.languageCode, null);
      expect(track.isForced, false);
      expect(track.isHi, false);
      expect(track.filePath, null);
    });

    test('displayLabel formats correctly', () {
      final track = SubtitleTrack(
        source: 'opensubtitles',
        languageCode: 'en',
        isForced: true,
        isHi: true,
      );
      expect(track.displayLabel, 'English · Forced · HI');
    });
  });

  group('SubtitleSearchResult', () {
    test('fromJson parses correctly', () {
      final result = SubtitleSearchResult.fromJson({
        'languageCode': 'es',
        'isForced': false,
        'isHi': false,
        'provider': 'opensubtitles',
        'score': 95.5,
        'releaseName': 'Movie.2024.1080p',
        'extension': '.srt',
      });
      expect(result.languageCode, 'es');
      expect(result.provider, 'opensubtitles');
      expect(result.score, 95.5);
      expect(result.releaseName, 'Movie.2024.1080p');
    });
  });

  group('VariantInventory', () {
    test('fromJson parses correctly', () {
      final inventory = VariantInventory.fromJson({
        'variantId': 1,
        'path': '/path/to/movie.mkv',
        'subtitleTracks': [
          {
            'source': 'opensubtitles',
            'languageCode': 'en',
            'isForced': false,
            'isHi': false,
          }
        ],
        'missingSubtitles': [
          {
            'languageCode': 'es',
            'isForced': false,
            'isHi': false,
          }
        ],
      });
      expect(inventory.variantId, 1);
      expect(inventory.subtitleTracks.length, 1);
      expect(inventory.missingSubtitles.length, 1);
    });
  });

  group('ApiClient subtitle methods', () {
    late MediarrApiClient client;
    late Dio dio;

    setUp(() {
      dio = Dio();
      client = MediarrApiClient(dio: dio);
    });

    tearDown(() {
      client.dispose();
    });

    test('getMovieSubtitles returns list of VariantInventory', () async {
      dio.interceptors.add(InterceptorsWrapper(
        onRequest: (options, handler) {
          if (options.path.contains('/api/subtitles/movie/123/variants')) {
            handler.resolve(Response(
              requestOptions: options,
              statusCode: 200,
              data: {
                'ok': true,
                'data': [
                  {
                    'variantId': 1,
                    'path': '/movie.mkv',
                    'subtitleTracks': [
                      {
                        'source': 'opensubtitles',
                        'languageCode': 'en',
                        'isForced': false,
                        'isHi': false,
                      }
                    ],
                    'missingSubtitles': [],
                  }
                ],
              },
            ));
            return;
          }
          handler.resolve(Response(
            requestOptions: options,
            statusCode: 200,
            data: {'version': '1.0.0', 'startTime': ''},
          ));
        },
      ));

      await client.connect('http://localhost:5174');
      final results = await client.getMovieSubtitles(123);
      expect(results.length, 1);
      expect(results.first.variantId, 1);
      expect(results.first.subtitleTracks.first.languageCode, 'en');
    });

    test('getEpisodeSubtitles returns list of VariantInventory', () async {
      dio.interceptors.add(InterceptorsWrapper(
        onRequest: (options, handler) {
          if (options.path.contains('/api/subtitles/episode/456/variants')) {
            handler.resolve(Response(
              requestOptions: options,
              statusCode: 200,
              data: {
                'ok': true,
                'data': [
                  {
                    'variantId': 2,
                    'path': '/episode.mkv',
                    'subtitleTracks': [],
                    'missingSubtitles': [
                      {
                        'languageCode': 'es',
                        'isForced': false,
                        'isHi': false,
                      }
                    ],
                  }
                ],
              },
            ));
            return;
          }
          handler.resolve(Response(
            requestOptions: options,
            statusCode: 200,
            data: {'version': '1.0.0', 'startTime': ''},
          ));
        },
      ));

      await client.connect('http://localhost:5174');
      final results = await client.getEpisodeSubtitles(456);
      expect(results.length, 1);
      expect(results.first.missingSubtitles.first.languageCode, 'es');
    });

    test('searchSubtitles returns list of SubtitleSearchResult', () async {
      dio.interceptors.add(InterceptorsWrapper(
        onRequest: (options, handler) {
          if (options.path.contains('/api/subtitles/search')) {
            handler.resolve(Response(
              requestOptions: options,
              statusCode: 200,
              data: {
                'ok': true,
                'data': [
                  {
                    'languageCode': 'en',
                    'isForced': false,
                    'isHi': false,
                    'provider': 'opensubtitles',
                    'score': 100,
                  }
                ],
              },
            ));
            return;
          }
          handler.resolve(Response(
            requestOptions: options,
            statusCode: 200,
            data: {'version': '1.0.0', 'startTime': ''},
          ));
        },
      ));

      await client.connect('http://localhost:5174');
      final results = await client.searchSubtitles(movieId: 123);
      expect(results.length, 1);
      expect(results.first.languageCode, 'en');
      expect(results.first.provider, 'opensubtitles');
    });

    test('downloadSubtitle returns storedPath', () async {
      dio.interceptors.add(InterceptorsWrapper(
        onRequest: (options, handler) {
          if (options.path.contains('/api/subtitles/download')) {
            handler.resolve(Response(
              requestOptions: options,
              statusCode: 200,
              data: {
                'ok': true,
                'data': {
                  'storedPath': '/subtitles/movie_en.srt',
                },
              },
            ));
            return;
          }
          handler.resolve(Response(
            requestOptions: options,
            statusCode: 200,
            data: {'version': '1.0.0', 'startTime': ''},
          ));
        },
      ));

      await client.connect('http://localhost:5174');
      const candidate = SubtitleSearchResult(
        languageCode: 'en',
        isForced: false,
        isHi: false,
        provider: 'opensubtitles',
        score: 100,
      );

      final path = await client.downloadSubtitle(
        candidate: candidate,
        movieId: 123,
      );
      expect(path, '/subtitles/movie_en.srt');
    });
  });
}
