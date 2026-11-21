import 'dart:async';

import 'package:mediarr_client/shared/models/adult_item.dart';
import 'package:mediarr_client/shared/models/collection.dart';
import 'package:mediarr_client/shared/models/library_item.dart';
import 'package:mediarr_client/shared/models/library_search_item.dart';
import 'package:mediarr_client/shared/models/movie.dart';
import 'package:mediarr_client/shared/models/youtube_video.dart';
import 'package:mediarr_client/shared/models/music.dart';
import 'package:mediarr_client/shared/models/search_result.dart';
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
///   - [getStreamUrl]        — Phase 3 + Phase 4 Play action (records
///                             (movieId, type) / (episodeId, type) so the
///                             play test can assert the right id was
///                             fetched without needing to mount
///                             PlaybackScreen — which would crash a Flutter
///                             widget test environment via media_kit)
///   - [searchReleases]      — Phase 3 Search Upgrades + Phase 4 per-episode
///                             Search and series-level Search All Missing
///                             (records (query, type))
///   - [deleteSeries]        — Phase 4 Delete Series series-level action
///                             (records seriesId; the AlertDialog flow is
///                             tested via ActionBar's destructive path)
class FakeMediarrApiClient extends MediarrApiClient {
  List<Movie> moviesReturn = const [];
  List<LibrarySearchItem> librarySearchReturn = const [];
  String? lastLibrarySearchQuery;

  @override
  Future<List<LibrarySearchItem>> searchLibrary({
    required String query,
    String type = 'all',
    int limit = 30,
  }) async {
    lastLibrarySearchQuery = query;
    return librarySearchReturn;
  }
  List<Series> seriesReturn = const [];

  @override
  Future<List<Movie>> getMovies() async => moviesReturn;

  @override
  Future<List<Series>> getSeries() async => seriesReturn;

  @override
  Future<List<YoutubeVideo>> getYoutubeVideos({int limit = 200}) async => youtubeVideosReturn;

  @override
  Future<YoutubeQueueSummary?> getYoutubeQueue() async => youtubeQueueReturn;

  @override
  Future<YoutubeLatestPage> getYoutubeLatest({int limit = 8}) async => youtubeLatestReturn;
  FakeMediarrApiClient() : super();

  // --- Test-controllable returns ---

  Movie? getMovieReturn;
  List<YoutubeVideo> youtubeVideosReturn = const [];
  YoutubeLatestPage youtubeLatestReturn = const YoutubeLatestPage(items: [], newCount: 0);
  final List<({int trackId, int position, int duration})> musicProgressCalls = [];

  @override
  Future<void> reportMusicProgress({required int trackId, required int positionSeconds, required int durationSeconds}) async {
    musicProgressCalls.add((trackId: trackId, position: positionSeconds, duration: durationSeconds));
  }
  YoutubeQueueSummary? youtubeQueueReturn;
  Object? getMovieError;

  // --- Collections (FR-4) ---

  List<MediaCollection> getCollectionsReturn = const [];
  List<CollectionMovie> getCollectionMoviesReturn = const [];
  final List<int> getCollectionMoviesCalls = [];

  // --- Music (feature_music_library_20261107) ---

  List<MusicArtist> musicArtistsReturn = const [];
  List<MusicAlbum> musicAlbumsReturn = const [];
  List<MusicTrack> musicTracksReturn = const [];

  String? lastMoviesSearch;
  String? lastYoutubeQuery;

  @override
  Future<YoutubeVideoPage> getYoutubeVideoPage({
    String query = '',
    String sort = 'added',
    String watched = 'all',
    String? channel,
    int offset = 0,
    int limit = 200,
  }) async {
    lastYoutubeQuery = query;
    final all = await getYoutubeVideos(limit: limit);
    final filtered = query.isEmpty
        ? all
        : all.where((video) => '${video.title} ${video.channel ?? ''}'.toLowerCase().contains(query.toLowerCase())).toList();
    return YoutubeVideoPage(items: filtered, total: filtered.length, offset: offset);
  }

  @override
  Future<List<Movie>> getMoviesFiltered({
    String search = '',
    String sortBy = 'title',
    bool sortAsc = true,
    bool? monitored,
  }) async {
    lastMoviesSearch = search;
    return getMovies();
  }
  MusicAlbumDetail? musicAlbumReturn;
  final List<int?> musicAlbumsArtistCalls = [];
  final List<int> musicAlbumCalls = [];

  @override
  Future<List<MusicArtist>> getMusicArtists() async => musicArtistsReturn;

  @override
  Future<List<MusicAlbum>> getMusicAlbums({int? artistId, bool recent = false}) async {
    musicAlbumsArtistCalls.add(artistId);
    return musicAlbumsReturn;
  }

  @override
  Future<List<MusicTrack>> getMusicTracks({String query = '', int limit = 100}) async => musicTracksReturn;

  String? lastMusicTracksQuery;

  @override
  Future<MusicTrackPage> getMusicTrackPage({
    String query = '',
    int limit = 200,
    int offset = 0,
    String sort = 'title',
    int? artistId,
    int? albumId,
  }) async {
    lastMusicTracksQuery = query;
    final filtered = query.isEmpty
        ? musicTracksReturn
        : musicTracksReturn.where((track) {
            final haystack = '${track.title} ${track.artistName ?? ''} ${track.albumTitle ?? ''}'.toLowerCase();
            return haystack.contains(query.toLowerCase());
          }).toList();
    return MusicTrackPage(items: filtered, total: filtered.length, offset: offset);
  }

  @override
  Future<MusicAlbumDetail> getMusicAlbum(int albumId) async {
    musicAlbumCalls.add(albumId);
    return musicAlbumReturn ??
        MusicAlbumDetail(
          album: MusicAlbum(id: albumId, artistId: 1, title: 'Album'),
          tracks: const [],
        );
  }

  @override
  String musicStreamUrl(int trackId) => 'http://example.com/music/$trackId';

  @override
  String musicArtworkUrl(int albumId) => 'http://example.com/art/$albumId';

  @override
  Future<List<MediaCollection>> getCollections() async =>
      getCollectionsReturn;

  @override
  Future<List<CollectionMovie>> getCollectionMovies(int collectionId) async {
    getCollectionMoviesCalls.add(collectionId);
    return getCollectionMoviesReturn;
  }

  Series? getSeriesByIdReturn;
  Object? getSeriesByIdError;

  Series? getSeriesDetailReturn;
  Object? getSeriesDetailError;

  /// When non-null, [getSeriesDetail] returns this completer's future
  /// instead of the synchronous [getSeriesDetailReturn]. Used by Phase 4
  /// loading-state tests to hold the screen in its loading state until the
  /// test is ready to assert.
  Completer<Series?>? getSeriesDetailCompleter;

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

  final List<({int seasonId, bool watched})> seasonWatchedCalls = [];

  @override
  Future<int> setSeasonWatched({required int seasonId, required bool watched}) async {
    seasonWatchedCalls.add((seasonId: seasonId, watched: watched));
    return 0;
  }

  @override
  Future<Series?> getSeriesDetail(int id) async {
    getSeriesDetailCalls.add(id);
    if (getSeriesDetailCompleter != null) {
      return getSeriesDetailCompleter!.future;
    }
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

  // --- searchReleases (Phase 3 Search Upgrades + Phase 4 Search All Missing
  //     and per-episode Search) ---

  List<Release> searchReleasesReturn = const [];
  Object? searchReleasesError;
  final List<({String? query, String? type, int? season, int? episode})>
      searchReleasesCalls = [];

  @override
  Future<List<Release>> searchReleases({
    String? query,
    String? type,
    int? season,
    int? episode,
    int? tmdbId,
    int? tvdbId,
    int? year,
    int? qualityProfileId,
  }) async {
    searchReleasesCalls
        .add((query: query, type: type, season: season, episode: episode));
    if (searchReleasesError != null) throw searchReleasesError!;
    return searchReleasesReturn;
  }

  // --- deleteSeries (Phase 4 Delete Series series-level action) ---

  Object? deleteSeriesError;
  final List<int> deleteSeriesCalls = [];

  @override
  Future<void> deleteSeries(int seriesId) async {
    deleteSeriesCalls.add(seriesId);
    if (deleteSeriesError != null) throw deleteSeriesError!;
  }

  // --- deleteMovie (movie-level Delete action) ---

  Object? deleteMovieError;
  final List<int> deleteMovieCalls = [];

  @override
  Future<void> deleteMovie(int movieId) async {
    deleteMovieCalls.add(movieId);
    if (deleteMovieError != null) throw deleteMovieError!;
  }


  // --- searchSubtitles (SubtitleSearchSheet) ---

  List<SubtitleSearchResult> searchSubtitlesReturn = const [];
  Object? searchSubtitlesError;
  final List<({int? movieId, int? episodeId, int? variantId})> searchSubtitlesCalls = [];

  @override
  Future<List<SubtitleSearchResult>> searchSubtitles({
    int? movieId,
    int? episodeId,
    int? variantId,
  }) async {
    searchSubtitlesCalls.add((movieId: movieId, episodeId: episodeId, variantId: variantId));
    if (searchSubtitlesError != null) throw searchSubtitlesError!;
    return searchSubtitlesReturn;
  }

  // --- getPlaybackManifest (PlaybackScreen._startPlayback) ---

  PlaybackManifest? getPlaybackManifestReturn;
  final List<({String mediaType, int mediaId, bool watched})> setWatchedCalls = [];

  @override
  Future<void> setWatched({required String mediaType, required int mediaId, required bool watched}) async {
    setWatchedCalls.add((mediaType: mediaType, mediaId: mediaId, watched: watched));
  }
  Object? getPlaybackManifestError;
  /// When set, the manifest request waits for this before answering. Lets tests
  /// dispose the playback screen while the request is still in flight.
  Completer<void>? getPlaybackManifestGate;
  final List<({int mediaId, String type})> getPlaybackManifestCalls = [];

  @override
  Future<PlaybackManifest?> getPlaybackManifest({
    required int mediaId,
    required String type,
    String? userId,
  }) async {
    getPlaybackManifestCalls.add((mediaId: mediaId, type: type));
    final gate = getPlaybackManifestGate;
    if (gate != null) await gate.future;
    if (getPlaybackManifestError != null) throw getPlaybackManifestError!;
    return getPlaybackManifestReturn;
  }

  // --- reportPlaybackProgress (PlaybackService progress timer) ---

  final List<({int mediaId, String type, int positionSeconds, int durationSeconds})>
      reportPlaybackProgressCalls = [];
  Object? reportPlaybackProgressError;

  @override
  Future<void> reportPlaybackProgress({
    required int mediaId,
    required String type,
    required int positionSeconds,
    required int durationSeconds,
  }) async {
    reportPlaybackProgressCalls.add((
      mediaId: mediaId,
      type: type,
      positionSeconds: positionSeconds,
      durationSeconds: durationSeconds,
    ));
    if (reportPlaybackProgressError != null) throw reportPlaybackProgressError!;
  }

  // --- downloadSubtitle (SubtitleSearchSheet) ---

  String? downloadSubtitleReturn;
  Object? downloadSubtitleError;

  @override
  Future<String?> downloadSubtitle({
    required SubtitleSearchResult candidate,
    int? movieId,
    int? episodeId,
    int? variantId,
  }) async {
    if (downloadSubtitleError != null) throw downloadSubtitleError!;
    return downloadSubtitleReturn;
  }

  // --- grabRelease (QualityUpgradeSheet) ---

  Object? grabReleaseError;
  final List<({String guid, int indexerId})> grabReleaseCalls = [];

  @override
  Future<void> grabRelease({
    required String guid,
    required int indexerId,
    int? downloadClientId,
  }) async {
    grabReleaseCalls.add((guid: guid, indexerId: indexerId));
    if (grabReleaseError != null) throw grabReleaseError!;
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

  // --- Adult library + retention decisions (feature_adult_retention_keep_delete_20261111) ---

  AdultItemsPage adultItemsReturn = const AdultItemsPage(
    items: [],
    page: 1,
    pageSize: 24,
    totalCount: 0,
    needsReview: 0,
  );
  Object? getAdultItemsError;
  final List<({String? query, int page, int pageSize, List<String> tags})> getAdultItemsCalls = [];

  AdultSeriesPage adultSeriesReturn = const AdultSeriesPage(series: [], unshelved: 0);
  List<AdultTagCount> adultTagsReturn = const [];

  AdultDecisions adultDecisionsReturn = const AdultDecisions();
  Object? fetchAdultDecisionsError;
  int fetchAdultDecisionsCalls = 0;

  /// Overrides the default effect of a decision, which mirrors the server: the item leaves the
  /// undecided list and — for delete — disappears from the library, because the file is gone.
  AdultDecisionResult Function(int id, String decision)? decideAdultItemHandler;
  Object? decideAdultItemError;
  final List<({int id, String decision})> decideAdultItemCalls = [];

  @override
  Future<AdultItemsPage> getAdultItems({
    String? query,
    int page = 1,
    int pageSize = 24,
    List<String> tags = const [],
  }) async {
    getAdultItemsCalls.add((query: query, page: page, pageSize: pageSize, tags: tags));
    if (getAdultItemsError != null) throw getAdultItemsError!;
    return adultItemsReturn;
  }

  @override
  Future<AdultSeriesPage> getAdultSeries() async => adultSeriesReturn;

  @override
  Future<List<AdultTagCount>> getAdultTags() async => adultTagsReturn;

  @override
  Future<AdultDecisions> fetchAdultDecisions() async {
    fetchAdultDecisionsCalls += 1;
    if (fetchAdultDecisionsError != null) throw fetchAdultDecisionsError!;
    return adultDecisionsReturn;
  }

  @override
  Future<AdultDecisionResult> decideAdultItem(int id, String decision) async {
    decideAdultItemCalls.add((id: id, decision: decision));
    if (decideAdultItemError != null) throw decideAdultItemError!;
    final handler = decideAdultItemHandler;
    if (handler != null) return handler(id, decision);
    final remaining =
        adultDecisionsReturn.items.where((candidate) => candidate.id != id).toList();
    adultDecisionsReturn = AdultDecisions(items: remaining, total: remaining.length);
    if (decision == 'delete') {
      adultItemsReturn = AdultItemsPage(
        items: adultItemsReturn.items.where((item) => item.id != id).toList(),
        page: adultItemsReturn.page,
        pageSize: adultItemsReturn.pageSize,
        totalCount:
            adultItemsReturn.totalCount > 0 ? adultItemsReturn.totalCount - 1 : 0,
        needsReview: adultItemsReturn.needsReview,
      );
    }
    return AdultDecisionResult(
      id: id,
      decision: decision,
      kept: decision == 'keep',
      deleted: decision == 'delete',
    );
  }

  @override
  String adultStreamUrl(int id) => 'http://fake/adult/$id';

  final List<({int mediaId, int positionSeconds, int durationSeconds})>
      reportAdultProgressCalls = [];

  @override
  Future<void> reportAdultProgress({
    required int mediaId,
    required int positionSeconds,
    required int durationSeconds,
  }) async {
    reportAdultProgressCalls.add((
      mediaId: mediaId,
      positionSeconds: positionSeconds,
      durationSeconds: durationSeconds,
    ));
  }
}
