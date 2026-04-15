import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/core/theme/mediarr_theme.dart';
import 'package:mediarr_client/features/search/search_result_detail_sheet.dart';
import 'package:mediarr_client/shared/models/search_result.dart';
import 'package:mediarr_client/shared/services/api_client.dart';

void main() {
  group('SearchResultDetailSheet', () {
    const testResult = SearchResult(
      tmdbId: 27205,
      tvdbId: 0,
      title: 'Inception',
      year: 2010,
      overview: 'A thief who steals corporate secrets...',
      posterUrl: null,
      mediaType: 'movie',
    );

    const testSeriesResult = SearchResult(
      tmdbId: 577922,
      tvdbId: 12345,
      title: 'Breaking Bad',
      year: 2008,
      overview: 'A high school chemistry teacher...',
      posterUrl: null,
      mediaType: 'series',
    );

    final testReleases = [
      const Release(
        guid: 'guid-1',
        indexerId: 1,
        title: 'Inception.2010.1080p.BluRay.x264-GROUP',
        size: 8589934592,
        seeders: 100,
        leechers: 10,
        quality: '1080p',
        indexerName: 'Indexer1',
        age: 100,
        downloadUrl: 'https://example.com/download',
        magnetUrl: 'magnet:?xt=urn:btih:example',
      ),
      const Release(
        guid: 'guid-2',
        indexerId: 1,
        title: 'Inception.2010.720p.BluRay.x264-GROUP',
        size: 4294967296,
        seeders: 50,
        quality: '720p',
        indexerName: 'Indexer1',
        age: 200,
        downloadUrl: 'https://example.com/download2',
      ),
    ];

    testWidgets('renders metadata section', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            releasesProvider.overrideWith((ref, result) async => []),
          ],
          child: MaterialApp(
            theme: mediarrDarkTheme,
            home: Scaffold(
              body: SearchResultDetailSheet(result: testResult),
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Inception'), findsOneWidget);
      expect(find.text('2010'), findsOneWidget);
      expect(find.text('MOVIE'), findsOneWidget);
    });

    testWidgets('renders series result with SERIES badge', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            releasesProvider.overrideWith((ref, result) async => []),
          ],
          child: MaterialApp(
            theme: mediarrDarkTheme,
            home: Scaffold(
              body: SearchResultDetailSheet(result: testSeriesResult),
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Breaking Bad'), findsOneWidget);
      expect(find.text('2008'), findsOneWidget);
      expect(find.text('SERIES'), findsOneWidget);
    });

    testWidgets('shows loading indicator while fetching releases',
        (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            releasesProvider.overrideWith((ref, result) async {
              await Completer<void>().future;
              return [];
            }),
          ],
          child: MaterialApp(
            theme: mediarrDarkTheme,
            home: Scaffold(
              body: SearchResultDetailSheet(result: testResult),
            ),
          ),
        ),
      );

      await tester.pump();
      expect(find.byType(CircularProgressIndicator), findsWidgets);
    });

    testWidgets('renders release list when loaded', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            releasesProvider.overrideWith((ref, result) async => testReleases),
          ],
          child: MaterialApp(
            theme: mediarrDarkTheme,
            home: Scaffold(
              body: SearchResultDetailSheet(result: testResult),
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Available Releases'), findsOneWidget);
      expect(
          find.text('Inception.2010.1080p.BluRay.x264-GROUP'), findsOneWidget);
      expect(find.text('Inception.2010.720p.BluRay.x264-GROUP'), findsOneWidget);
      expect(find.text('8.00 GB'), findsOneWidget);
      expect(find.text('4.00 GB'), findsOneWidget);
      expect(find.text('100'), findsOneWidget);
      expect(find.text('50'), findsOneWidget);
    });

    testWidgets('shows empty releases state when no releases', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            releasesProvider.overrideWith((ref, result) async => []),
          ],
          child: MaterialApp(
            theme: mediarrDarkTheme,
            home: Scaffold(
              body: SearchResultDetailSheet(result: testResult),
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Available Releases'), findsOneWidget);
      expect(find.text('No releases found'), findsOneWidget);
    });

    testWidgets('shows error state when releases fail to load',
        (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            releasesProvider.overrideWith((ref, result) async {
              throw Exception('Network error');
            }),
          ],
          child: MaterialApp(
            theme: mediarrDarkTheme,
            home: Scaffold(
              body: SearchResultDetailSheet(result: testResult),
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.textContaining('Failed to load releases'), findsOneWidget);
    });

    testWidgets('shows Add to Library button', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            releasesProvider.overrideWith((ref, result) async => []),
          ],
          child: MaterialApp(
            theme: mediarrDarkTheme,
            home: Scaffold(
              body: SearchResultDetailSheet(result: testResult),
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Add to Library'), findsOneWidget);
      expect(find.byIcon(Icons.add), findsOneWidget);
    });

    testWidgets('shows grab buttons for each release', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            releasesProvider.overrideWith((ref, result) async => testReleases),
          ],
          child: MaterialApp(
            theme: mediarrDarkTheme,
            home: Scaffold(
              body: SearchResultDetailSheet(result: testResult),
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.byIcon(Icons.download), findsNWidgets(2));
    });

    testWidgets('shows quality badges for releases', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            releasesProvider.overrideWith((ref, result) async => testReleases),
          ],
          child: MaterialApp(
            theme: mediarrDarkTheme,
            home: Scaffold(
              body: SearchResultDetailSheet(result: testResult),
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('1080p'), findsOneWidget);
      expect(find.text('720p'), findsOneWidget);
    });
  });
}