import 'dart:async';

import 'package:mediarr_client/shared/models/episode.dart';
import 'package:mediarr_client/shared/models/library_item.dart';
import 'package:mediarr_client/shared/models/movie.dart';
import 'package:mediarr_client/shared/models/search_result.dart';
import 'package:mediarr_client/shared/models/season.dart';
import 'package:mediarr_client/shared/models/series.dart';
import 'package:mediarr_client/shared/models/subtitle_models.dart';
import 'package:mediarr_client/shared/services/api_client.dart';

/// Test fixture for [MediarrApiClient].
///
/// Pattern from `test-strategy.md` §3: extend the real `MediarrApiClient`
/// (the Riverpod notifier), implement every public method as
/// `throw UnimplementedError`, and override only the methods the test needs.
///
/// Why extend instead of `implements`: `library_screen_test.dart` already uses
/// `apiClientProvider.overrideWith((ref) => FakeMediarrApiClient(...))` style
/// overrides elsewhere. If we `implements`, every new API method added to
/// [MediarrApiClient] would force this fake to grow a stub (lessons-learned
/// 2026-04-17). Extending keeps the surface stable: only the methods we
/// explicitly throw surface as test failures.
///
/// Coverage scope (per test-strategy.md §3 — `fakes/fake_api_client.dart`):
///   - [getMovie]            — Phase 1 nav tap → MovieDetailScreen
///   - [getSeriesById]       — Phase 1 nav tap → SeriesDetailScreen
///   - [getSeriesDetail]     — SeriesDetailScreen.initState() refetch
///   - [getMovieSubtitles]   — Phase 3 subtitle fetch (Completer-driven
///                             loading/error/success test)
///   - [getStreamUrl]        — Phase 3 Play action (records (movieId, type)
///                             so the play test can assert the right id was
///                             fetched without needing to mount
///                             PlaybackScreen — which would crash a Flutter
///                             widget test environment via media_kit)
class FakeMediarrApiClient extends MediarrApiClient {
  FakeMediarrApiClient() : super();

  // --- Test-controllable returns ---

  Movie? getMovieReturn;
  Object? getMovieError;

  Series? getSeriesByIdReturn;
  Object? getSeriesByIdError;

  Series? getSeriesDetailReturn;
  Object? getSeriesDetailError;

  List<VariantInventory> getMovieSubtitlesReturn = const [];
  Object? getMovieSubtitlesError;

  /// When non-null, [getMovieSubtitles] returns this completer's future
  /// instead of the synchronous [getMovieSubtitlesReturn]. Used by Phase 3
  /// loading-state tests to hold the screen in its loading state until the
  /// test is ready to assert.
  Completer<List<VariantInventory>>? getMovieSubtitlesCompleter;

  // --- Recorded calls (for behavior assertions) ---

  final List<int> getMovieCalls = [];
  final List<int> getSeriesByIdCalls = [];
  final List<int> getSeriesDetailCalls = [];
  final List<int> getMovieSubtitlesCalls = [];
  final List<({int movieId, String type})> getStreamUrlCalls = [];

  // --- Overrides ---

  @override
  Future<Movie?> getMovie(int id) async {
    getMovieCalls.add(id);
    if (getMovieError != null) throw getMovieError!;
    return getMovieReturn;
  }

  @override
  Future<Series?> getSeriesById(int id) async {
    getSeriesByIdCalls.add(id);
    if (getSeriesByIdError != null) throw getSeriesByIdError!;
    return getSeriesByIdReturn;
  }

  @override
  Future<Series?> getSeriesDetail(int id) async {
    getSeriesDetailCalls.add(id);
    if (getSeriesDetailError != null) throw getSeriesDetailError!;
    return getSeriesDetailReturn;
  }

  @override
  Future<List<VariantInventory>> getMovieSubtitles(int movieId) async {
    getMovieSubtitlesCalls.add(movieId);
    if (getMovieSubtitlesCompleter != null) {
      return getMovieSubtitlesCompleter!.future;
    }
    if (getMovieSubtitlesError != null) throw getMovieSubtitlesError!;
    return getMovieSubtitlesReturn;
  }

  // --- searchReleases (Phase 3 Search Upgrades action) ---

  List<Release> searchReleasesReturn = const [];
  Object? searchReleasesError;
  final List<({String? query, String? type})> searchReleasesCalls = [];

  @override
  Future<List<Release>> searchReleases({
    String? query,
    String? type,
    int? tmdbId,
    int? tvdbId,
    int? year,
    int? qualityProfileId,
  }) async {
    searchReleasesCalls.add((query: query, type: type));
    if (searchReleasesError != null) throw searchReleasesError!;
    return searchReleasesReturn;
  }

  // --- Default no-op stubs for methods not exercised by tests ---
  // LibraryScreen calls getLibrary via libraryProvider; tests
  // override libraryProvider directly so getLibrary is not invoked here.

  @override
  Future<({List<LibraryItem> items, int page, int pageSize, int totalCount, int totalPages})> getLibrary({
    String? type,
    String? sortBy,
    String? sortDir,
    int page = 1,
    int pageSize = 25,
  }) async {
    throw UnimplementedError('FakeMediarrApiClient.getLibrary — override libraryProvider in test');
  }

  @override
  Future<List<SearchResult>> search(String query, {String? mediaType}) async {
    throw UnimplementedError('FakeMediarrApiClient.search');
  }

  @override
  Future<List<VariantInventory>> getEpisodeSubtitles(int episodeId) async {
    throw UnimplementedError('FakeMediarrApiClient.getEpisodeSubtitles');
  }

  @override
  String getStreamUrl(int mediaId, String type) {
    getStreamUrlCalls.add((movieId: mediaId, type: type));
    return 'http://fake/$type/$mediaId';
  }
}