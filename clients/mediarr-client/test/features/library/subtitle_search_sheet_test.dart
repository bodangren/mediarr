import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/features/library/subtitle_search_sheet.dart';
import 'package:mediarr_client/shared/models/subtitle_models.dart';

import 'package:mediarr_client/shared/services/api_client.dart';

import '../../support/fakes/fake_api_client.dart';

void main() {
  group('SubtitleSearchSheet', () {
    late FakeMediarrApiClient fakeClient;

    setUp(() {
      fakeClient = FakeMediarrApiClient();
    });

    Widget buildSheet({
      int? movieId,
      int? episodeId,
      VoidCallback? onDownloaded,
    }) {
      return ProviderScope(
        overrides: [
          apiClientProvider.overrideWith((ref) => fakeClient),
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
      fakeClient.searchSubtitlesReturn = [];

      await tester.pumpWidget(buildSheet(movieId: 1));
      await tester.tap(find.text('Show'));
      await tester.pump();

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('shows search results', (tester) async {
      fakeClient.searchSubtitlesReturn = [
        const SubtitleSearchResult(
          languageCode: 'en',
          isForced: false,
          isHi: false,
          provider: 'opensubtitles',
          score: 95,
          releaseName: 'Movie.2024.1080p.BluRay',
        ),
        const SubtitleSearchResult(
          languageCode: 'es',
          isForced: false,
          isHi: false,
          provider: 'opensubtitles',
          score: 88,
        ),
      ];

      await tester.pumpWidget(buildSheet(movieId: 1));
      await tester.tap(find.text('Show'));
      await tester.pumpAndSettle();

      expect(find.text('English'), findsOneWidget);
      expect(find.text('Spanish'), findsOneWidget);
      expect(find.text('opensubtitles'), findsNWidgets(2));
    });

    testWidgets('shows empty state when no results', (tester) async {
      fakeClient.searchSubtitlesReturn = [];

      await tester.pumpWidget(buildSheet(movieId: 1));
      await tester.tap(find.text('Show'));
      await tester.pumpAndSettle();

      expect(find.text('No subtitles found'), findsOneWidget);
    });

    testWidgets('shows error state on failure', (tester) async {
      fakeClient.searchSubtitlesError = Exception('Search failed');

      await tester.pumpWidget(buildSheet(movieId: 1));
      await tester.tap(find.text('Show'));
      await tester.pumpAndSettle();

      expect(find.textContaining('Search failed'), findsOneWidget);
      expect(find.text('Retry'), findsOneWidget);
    });

    testWidgets('download button triggers download', (tester) async {
      fakeClient.searchSubtitlesReturn = [
        const SubtitleSearchResult(
          languageCode: 'en',
          isForced: false,
          isHi: false,
          provider: 'opensubtitles',
          score: 95,
        ),
      ];
      fakeClient.downloadSubtitleReturn = '/subtitles/movie_en.srt';

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
