import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/features/library/subtitle_search_sheet.dart';
import 'package:mediarr_client/shared/models/subtitle_models.dart';
import 'package:mediarr_client/shared/services/api_client.dart';

import '../../shared/services/api_client_test.dart';

void main() {
  group('SubtitleSearchSheet', () {
    late MockHttpAdapter adapter;
    late MediarrApiClient client;

    setUp(() {
      adapter = MockHttpAdapter();
      final dio = Dio();
      dio.httpClientAdapter = adapter;
      client = MediarrApiClient(dio: dio);
      client.connect('http://localhost:5174');
    });

    Widget buildSheet({
      int? movieId,
      int? episodeId,
      VoidCallback? onDownloaded,
    }) {
      return ProviderScope(
        overrides: [
          apiClientProvider.overrideWith((ref) => client),
        ],
        child: MaterialApp(
          home: Scaffold(
            body: Builder(
              builder: (context) => ElevatedButton(
                onPressed: () {
                  showModalBottomSheet(
                    context: context,
                    builder: (_) => SubtitleSearchSheet(
                      movieId: movieId,
                      episodeId: episodeId,
                      onDownloaded: onDownloaded ?? () {},
                    ),
                  );
                },
                child: const Text('Show'),
              ),
            ),
          ),
        ),
      );
    }

    testWidgets('shows loading state initially', (tester) async {
      adapter.onGet('/api/subtitles/search', data: {
        'ok': true,
        'data': [],
      });

      await tester.pumpWidget(buildSheet(movieId: 1));
      await tester.tap(find.text('Show'));
      await tester.pump();

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('shows search results', (tester) async {
      adapter.onGet('/api/subtitles/search', data: {
        'ok': true,
        'data': [
          {
            'languageCode': 'en',
            'isForced': false,
            'isHi': false,
            'provider': 'opensubtitles',
            'score': 95,
            'releaseName': 'Movie.2024.1080p.BluRay',
          },
          {
            'languageCode': 'es',
            'isForced': false,
            'isHi': false,
            'provider': 'opensubtitles',
            'score': 88,
          }
        ],
      });

      await tester.pumpWidget(buildSheet(movieId: 1));
      await tester.tap(find.text('Show'));
      await tester.pumpAndSettle();

      expect(find.text('English'), findsOneWidget);
      expect(find.text('Spanish'), findsOneWidget);
      expect(find.text('opensubtitles'), findsNWidgets(2));
    });

    testWidgets('shows empty state when no results', (tester) async {
      adapter.onGet('/api/subtitles/search', data: {
        'ok': true,
        'data': [],
      });

      await tester.pumpWidget(buildSheet(movieId: 1));
      await tester.tap(find.text('Show'));
      await tester.pumpAndSettle();

      expect(find.text('No subtitles found'), findsOneWidget);
    });

    testWidgets('shows error state on failure', (tester) async {
      adapter.onGet('/api/subtitles/search', data: {
        'error': 'Search failed',
      }, statusCode: 500);

      await tester.pumpWidget(buildSheet(movieId: 1));
      await tester.tap(find.text('Show'));
      await tester.pumpAndSettle();

      expect(find.text('Search failed'), findsOneWidget);
      expect(find.text('Retry'), findsOneWidget);
    });

    testWidgets('download button triggers download', (tester) async {
      adapter.onGet('/api/subtitles/search', data: {
        'ok': true,
        'data': [
          {
            'languageCode': 'en',
            'isForced': false,
            'isHi': false,
            'provider': 'opensubtitles',
            'score': 95,
          }
        ],
      });

      adapter.onGet('/api/subtitles/download', data: {
        'ok': true,
        'data': {
          'storedPath': '/subtitles/movie_en.srt',
        },
      });

      var downloaded = false;
      await tester.pumpWidget(buildSheet(
        movieId: 1,
        onDownloaded: () => downloaded = true,
      ));
      await tester.tap(find.text('Show'));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Download'));
      await tester.pumpAndSettle();

      expect(downloaded, true);
    });
  });
}
