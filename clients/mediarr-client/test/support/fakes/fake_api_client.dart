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
/// Coverage scope for Phase 1 (per test-strategy.md §3 — `fakes/fake_api_client.dart`):
///   - [getMovie]            — tapped movie → MovieDetailScreen nav
///   - [getSeriesById]       — tapped series → SeriesDetailScreen nav
///   - [getSeriesDetail]     — SeriesDetailScreen.initState() refetch
///   - [getMovieSubtitles]   — MovieDetailScreen.initState() refetch
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

  // --- Recorded calls (for behavior assertions) ---

  final List<int> getMovieCalls = [];
  final List<int> getSeriesByIdCalls = [];
  final List<int> getSeriesDetailCalls = [];
  final List<int> getMovieSubtitlesCalls = [];

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
    if (getMovieSubtitlesError != null) throw getMovieSubtitlesError!;
    return getMovieSubtitlesReturn;
  }

  // --- Default no-op stubs for methods not exercised in Phase 1 tests ---
  // LibraryScreen calls getLibrary via libraryProvider; Phase 1 tests
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
  String getStreamUrl(int mediaId, String type) => 'http://fake/$type/$mediaId';
}