import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/shared/models/episode.dart';
import 'package:mediarr_client/shared/models/movie.dart';
import 'package:mediarr_client/shared/models/series.dart';
import 'package:mediarr_client/shared/services/api_client.dart';

/// A mock HTTP adapter that returns predefined responses.
class MockHttpAdapter implements HttpClientAdapter {
  final Map<String, dynamic> _responses = {};
  final List<String> requestLog = [];

  void onGet(String path, {required dynamic data, int statusCode = 200}) {
    _responses[path] = _MockResponse(data: data, statusCode: statusCode);
  }

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<List<int>>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    requestLog.add('${options.method} ${options.path}');

    // Match by path (strip query params for matching)
    final pathOnly = options.path.split('?').first;
    final mock = _responses[pathOnly] ?? _responses[options.path];

    if (mock == null) {
      return ResponseBody.fromString(
        '{"error": "not found"}',
        404,
        headers: {
          'content-type': ['application/json'],
        },
      );
    }

    final resp = mock as _MockResponse;
    final body = resp.data is String ? resp.data : _encode(resp.data);

    return ResponseBody.fromString(
      body as String,
      resp.statusCode,
      headers: {
        'content-type': ['application/json'],
      },
    );
  }

  String _encode(dynamic data) {
    if (data is Map || data is List) {
      // Use dart:convert
      return Uri.encodeFull(data.toString());
    }
    return data.toString();
  }

  @override
  void close({bool force = false}) {}
}

class _MockResponse {
  final dynamic data;
  final int statusCode;
  _MockResponse({required this.data, this.statusCode = 200});
}

void main() {
  group('SystemStatus', () {
    test('fromJson parses correctly', () {
      final status = SystemStatus.fromJson({
        'version': '1.0.0',
        'startTime': '2026-03-28T00:00:00Z',
        'platform': 'linux',
      });
      expect(status.version, '1.0.0');
      expect(status.startTime, '2026-03-28T00:00:00Z');
      expect(status.platform, 'linux');
    });

    test('fromJson handles missing fields', () {
      final status = SystemStatus.fromJson({});
      expect(status.version, 'unknown');
      expect(status.startTime, '');
      expect(status.platform, isNull);
    });
  });

  group('ApiClientState', () {
    test('default state is disconnected', () {
      const state = ApiClientState();
      expect(state.status, ConnectionStatus.disconnected);
      expect(state.baseUrl, isNull);
      expect(state.lastError, isNull);
    });

    test('copyWith preserves unchanged fields', () {
      const original = ApiClientState(
        status: ConnectionStatus.connected,
        baseUrl: 'http://localhost:5174',
      );
      final updated = original.copyWith(lastError: 'test');
      expect(updated.status, ConnectionStatus.connected);
      expect(updated.baseUrl, 'http://localhost:5174');
      expect(updated.lastError, 'test');
    });
  });

  group('MediarrApiClient', () {
    late MediarrApiClient client;
    late Dio dio;

    setUp(() {
      dio = Dio();
      client = MediarrApiClient(dio: dio);
    });

    tearDown(() {
      client.dispose();
    });

    test('initial state is disconnected', () {
      expect(client.state.status, ConnectionStatus.disconnected);
    });

    test('connect sets connecting then connected on success', () async {
      // Use a real Dio interceptor to mock
      dio.interceptors.add(InterceptorsWrapper(
        onRequest: (options, handler) {
          handler.resolve(Response(
            requestOptions: options,
            statusCode: 200,
            data: {
              'version': '1.0.0',
              'startTime': '2026-03-28T00:00:00Z',
            },
          ));
        },
      ));

      final result = await client.connect('http://localhost:5174');

      expect(result, true);
      expect(client.state.status, ConnectionStatus.connected);
      expect(client.state.baseUrl, 'http://localhost:5174');
    });

    test('connect sets error on failure', () async {
      dio.interceptors.add(InterceptorsWrapper(
        onRequest: (options, handler) {
          handler.reject(DioException(
            requestOptions: options,
            type: DioExceptionType.connectionTimeout,
          ));
        },
      ));

      final result = await client.connect('http://unreachable:5174');

      expect(result, false);
      expect(client.state.status, ConnectionStatus.error);
      expect(client.state.lastError, isNotNull);
    });

    test('disconnect resets state', () async {
      dio.interceptors.add(InterceptorsWrapper(
        onRequest: (options, handler) {
          handler.resolve(Response(
            requestOptions: options,
            statusCode: 200,
            data: {'version': '1.0.0', 'startTime': ''},
          ));
        },
      ));

      await client.connect('http://localhost:5174');
      client.disconnect();

      expect(client.state.status, ConnectionStatus.disconnected);
      expect(client.state.baseUrl, isNull);
    });

    test('getMovies parses movie list', () async {
      dio.interceptors.add(InterceptorsWrapper(
        onRequest: (options, handler) {
          if (options.path.contains('/movies')) {
            handler.resolve(Response(
              requestOptions: options,
              statusCode: 200,
              data: [
                {
                  'id': 1,
                  'title': 'Inception',
                  'year': 2010,
                  'monitored': true,
                  'hasFile': true,
                },
                {
                  'id': 2,
                  'title': 'The Matrix',
                  'year': 1999,
                  'monitored': false,
                },
              ],
            ));
          } else {
            handler.resolve(Response(
              requestOptions: options,
              statusCode: 200,
              data: {'version': '1.0.0', 'startTime': ''},
            ));
          }
        },
      ));

      await client.connect('http://localhost:5174');
      final movies = await client.getMovies();

      expect(movies.length, 2);
      expect(movies[0].title, 'Inception');
      expect(movies[0].year, 2010);
      expect(movies[0].monitored, true);
      expect(movies[0].hasFile, true);
      expect(movies[1].title, 'The Matrix');
    });

    test('getSeries parses series list', () async {
      dio.interceptors.add(InterceptorsWrapper(
        onRequest: (options, handler) {
          if (options.path.contains('/series')) {
            handler.resolve(Response(
              requestOptions: options,
              statusCode: 200,
              data: [
                {
                  'id': 1,
                  'title': 'Breaking Bad',
                  'year': 2008,
                  'seasonCount': 5,
                  'episodeCount': 62,
                  'monitored': true,
                },
              ],
            ));
          } else {
            handler.resolve(Response(
              requestOptions: options,
              statusCode: 200,
              data: {'version': '1.0.0', 'startTime': ''},
            ));
          }
        },
      ));

      await client.connect('http://localhost:5174');
      final series = await client.getSeries();

      expect(series.length, 1);
      expect(series[0].title, 'Breaking Bad');
      expect(series[0].seasonCount, 5);
    });

    test('getStreamUrl builds correct URL', () async {
      dio.interceptors.add(InterceptorsWrapper(
        onRequest: (options, handler) {
          handler.resolve(Response(
            requestOptions: options,
            statusCode: 200,
            data: {'version': '1.0.0', 'startTime': ''},
          ));
        },
      ));

      await client.connect('http://192.168.1.100:5174');
      final url = client.getStreamUrl('/data/media/movies/Inception (2010)/Inception.mkv');

      expect(url, startsWith('http://192.168.1.100:5174/api/stream?path='));
      expect(url, contains('Inception'));
    });
  });

  group('Movie model', () {
    test('fromJson with all fields', () {
      final movie = Movie.fromJson({
        'id': 1,
        'title': 'Inception',
        'year': 2010,
        'overview': 'A thief...',
        'posterUrl': 'http://img/poster.jpg',
        'monitored': true,
        'hasFile': true,
        'quality': '1080p',
        'sizeOnDisk': 15000000000,
        'runtime': 148,
      });
      expect(movie.id, 1);
      expect(movie.title, 'Inception');
      expect(movie.year, 2010);
      expect(movie.monitored, true);
      expect(movie.quality, '1080p');
    });

    test('fromJson with minimal fields', () {
      final movie = Movie.fromJson({'id': 1, 'title': 'Test'});
      expect(movie.monitored, false);
      expect(movie.hasFile, false);
      expect(movie.year, isNull);
    });
  });

  group('Series model', () {
    test('fromJson with all fields', () {
      final series = Series.fromJson({
        'id': 1,
        'title': 'Breaking Bad',
        'year': 2008,
        'seasonCount': 5,
        'episodeCount': 62,
        'episodeFileCount': 62,
        'monitored': true,
        'status': 'ended',
        'network': 'AMC',
      });
      expect(series.title, 'Breaking Bad');
      expect(series.seasonCount, 5);
      expect(series.status, 'ended');
    });
  });

  group('Episode model', () {
    test('fromJson with all fields', () {
      final episode = Episode.fromJson({
        'id': 1,
        'seasonNumber': 1,
        'episodeNumber': 1,
        'title': 'Pilot',
        'airDateUtc': '2008-01-20T00:00:00Z',
        'hasFile': true,
        'monitored': true,
        'quality': '1080p',
      });
      expect(episode.title, 'Pilot');
      expect(episode.seasonNumber, 1);
      expect(episode.episodeNumber, 1);
      expect(episode.hasFile, true);
    });
  });
}
