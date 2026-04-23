import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/core/theme/mediarr_theme.dart';
import 'package:mediarr_client/features/search/search_result_detail_sheet.dart';
import 'package:mediarr_client/shared/models/episode.dart';
import 'package:mediarr_client/shared/models/movie.dart';
import 'package:mediarr_client/shared/models/search_result.dart';
import 'package:mediarr_client/shared/models/series.dart';
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

    testWidgets('tapping Add to Library calls addMovie for movie result', (tester) async {
      bool addMovieCalled = false;
      final mockClient = _MockMediarrApiClient(
        onAddMovie: () async { addMovieCalled = true; },
        onAddSeries: () async {},
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            releasesProvider.overrideWith((ref, result) async => []),
            apiClientProvider.overrideWith((ref) => mockClient),
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

      await tester.tap(find.text('Add to Library'));
      await tester.pump();

      expect(addMovieCalled, true);
    });

    testWidgets('tapping Add to Library calls addSeries for series result', (tester) async {
      bool addSeriesCalled = false;
      final mockClient = _MockMediarrApiClient(
        onAddMovie: () async {},
        onAddSeries: () async { addSeriesCalled = true; },
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            releasesProvider.overrideWith((ref, result) async => []),
            apiClientProvider.overrideWith((ref) => mockClient),
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

      await tester.tap(find.text('Add to Library'));
      await tester.pump();

      expect(addSeriesCalled, true);
    });

    testWidgets('sheet closes and addMovie succeeds for movie result', (tester) async {
      final mockClient = _MockMediarrApiClient(
        onAddMovie: () async {},
        onAddSeries: () async {},
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            releasesProvider.overrideWith((ref, result) async => []),
            apiClientProvider.overrideWith((ref) => mockClient),
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

      await tester.tap(find.text('Add to Library'));
      await tester.pumpAndSettle();

      expect(find.text('Add to Library'), findsNothing);
    });
  });
}

class _MockMediarrApiClient extends StateNotifier<ApiClientState>
    implements MediarrApiClient {
  _MockMediarrApiClient({
    required Future<void> Function() this.onAddMovie,
    required Future<void> Function() this.onAddSeries,
  }) : super(const ApiClientState(
          status: ConnectionStatus.connected,
          baseUrl: 'http://localhost:5174',
        ));

  final Future<void> Function() onAddMovie;
  final Future<void> Function() onAddSeries;

  @override
  Future<void> addMovie({
    required int tmdbId,
    required String title,
    required int year,
    int? qualityProfileId,
    bool monitored = true,
    bool searchNow = true,
    String? overview,
    String? posterUrl,
    int? imdbId,
  }) async {
    await onAddMovie();
  }

  @override
  Future<void> addSeries({
    required int tvdbId,
    required String title,
    required int year,
    int? qualityProfileId,
    bool monitored = true,
    bool searchNow = true,
    String? overview,
    String? posterUrl,
    int? tmdbId,
    String? imdbId,
  }) async {
    await onAddSeries();
  }

  @override
  Future<void> grabRelease({
    required String guid,
    required int indexerId,
    int? downloadClientId,
  }) async {}

  @override
  Future<bool> connect(String baseUrl) async => true;

  @override
  void disconnect() {}

  @override
  Future<SystemStatus?> getSystemStatus() async => null;

  @override
  Future<List<Movie>> getMovies({Map<String, String>? params}) async => [];

  @override
  Future<List<Series>> getSeries({Map<String, String>? params}) async => [];

  @override
  Future<List<SearchResult>> search(String query, {String? mediaType}) async => [];

  @override
  Future<List<Release>> searchReleases({
    String? query,
    String? type,
    int? tmdbId,
    int? tvdbId,
    int? year,
    int? qualityProfileId,
  }) async => [];

  @override
  Future<List<Episode>> getEpisodes(int seriesId) async => [];

  @override
  Future<Movie?> getMovie(int id) async => null;

  @override
  Future<Series?> getSeriesWithEpisodes(int id) async => null;

  @override
  Future<Series?> getSeriesDetail(int id) async => null;

  @override
  Future<PlaybackManifest?> getPlaybackManifest({
    required int mediaId,
    required String type,
    String? userId,
  }) async => null;

  @override
  Future<void> reportPlaybackProgress({
    required int mediaId,
    required String type,
    required int positionSeconds,
    required int durationSeconds,
  }) async {}

  @override
  Future<List<ContinueWatchingItem>> getContinueWatching({int limit = 20}) async => [];

  @override
  String getStreamUrl(int mediaId, String type) => '';

  @override
  Future<List<TorrentItem>> getTorrents() async => [];

  @override
  Future<List<ActivityEvent>> getActivity({
    int page = 1,
    int pageSize = 50,
    String? eventType,
    String? sourceModule,
    bool? success,
  }) async =>
      [];

  @override
  Future<List<UpcomingItem>> getUpcoming() async => [];

  @override
  Future<void> pauseTorrent(String infoHash) async {}

  @override
  Future<void> resumeTorrent(String infoHash) async {}

  @override
  Future<void> removeTorrent(String infoHash) async {}

  @override
  Stream<SseEvent> streamEvents() => const Stream.empty();

  @override
  void dispose() {}
}