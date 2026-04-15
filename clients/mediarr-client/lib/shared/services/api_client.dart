import 'dart:async';
import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/movie.dart';
import '../models/search_result.dart';
import '../models/series.dart';

/// System status response from the server.
class SystemStatus {
  const SystemStatus({
    required this.version,
    required this.startTime,
    this.platform,
  });

  final String version;
  final String startTime;
  final String? platform;

  factory SystemStatus.fromJson(Map<String, dynamic> json) {
    return SystemStatus(
      version: json['version'] as String? ?? 'unknown',
      startTime: json['startTime'] as String? ?? '',
      platform: json['platform'] as String?,
    );
  }
}

class PlaybackManifestMetadata {
  const PlaybackManifestMetadata({
    required this.mediaType,
    required this.mediaId,
    required this.title,
    this.overview,
    this.posterUrl,
    this.backdropUrl,
  });

  final String mediaType;
  final int mediaId;
  final String title;
  final String? overview;
  final String? posterUrl;
  final String? backdropUrl;

  factory PlaybackManifestMetadata.fromJson(Map<String, dynamic> json) {
    return PlaybackManifestMetadata(
      mediaType: json['mediaType'] as String? ?? '',
      mediaId: json['mediaId'] as int? ?? 0,
      title: json['title'] as String? ?? '',
      overview: json['overview'] as String?,
      posterUrl: json['posterUrl'] as String?,
      backdropUrl: json['backdropUrl'] as String?,
    );
  }
}

class PlaybackManifestResume {
  const PlaybackManifestResume({
    required this.userId,
    required this.position,
    required this.duration,
    required this.progress,
    required this.isWatched,
    required this.lastWatched,
  });

  final String userId;
  final int position;
  final int duration;
  final double progress;
  final bool isWatched;
  final DateTime lastWatched;

  factory PlaybackManifestResume.fromJson(Map<String, dynamic> json) {
    return PlaybackManifestResume(
      userId: json['userId'] as String? ?? 'lan-default',
      position: json['position'] as int? ?? 0,
      duration: json['duration'] as int? ?? 0,
      progress: (json['progress'] as num?)?.toDouble() ?? 0,
      isWatched: json['isWatched'] as bool? ?? false,
      lastWatched: DateTime.tryParse(json['lastWatched'] as String? ?? '') ??
          DateTime.fromMillisecondsSinceEpoch(0),
    );
  }
}

class PlaybackManifest {
  const PlaybackManifest({
    required this.streamUrl,
    required this.metadata,
    this.resume,
  });

  final String streamUrl;
  final PlaybackManifestMetadata metadata;
  final PlaybackManifestResume? resume;

  factory PlaybackManifest.fromJson(Map<String, dynamic> json) {
    return PlaybackManifest(
      streamUrl: json['streamUrl'] as String? ?? '',
      metadata: PlaybackManifestMetadata.fromJson(
        json['metadata'] as Map<String, dynamic>? ?? <String, dynamic>{},
      ),
      resume: json['resume'] != null
          ? PlaybackManifestResume.fromJson(
              json['resume'] as Map<String, dynamic>,
            )
          : null,
    );
  }
}

class ContinueWatchingItem {
  const ContinueWatchingItem({
    required this.mediaType,
    required this.mediaId,
    required this.title,
    required this.position,
    required this.duration,
    required this.progress,
    required this.lastWatched,
    this.episodeTitle,
    this.seriesId,
    this.seasonNumber,
    this.episodeNumber,
    this.posterUrl,
    this.backdropUrl,
  });

  final String mediaType;
  final int mediaId;
  final String title;
  final int position;
  final int duration;
  final double progress;
  final DateTime lastWatched;
  final String? episodeTitle;
  final int? seriesId;
  final int? seasonNumber;
  final int? episodeNumber;
  final String? posterUrl;
  final String? backdropUrl;

  String get mediaTypeQueryValue {
    final normalized = mediaType.toLowerCase();
    if (normalized == 'episode') return 'episode';
    if (normalized == 'movie') return 'movie';
    return normalized;
  }

  factory ContinueWatchingItem.fromJson(Map<String, dynamic> json) {
    return ContinueWatchingItem(
      mediaType: json['mediaType'] as String? ?? '',
      mediaId: json['mediaId'] as int? ?? 0,
      title: json['title'] as String? ?? '',
      position: json['position'] as int? ?? 0,
      duration: json['duration'] as int? ?? 0,
      progress: (json['progress'] as num?)?.toDouble() ?? 0,
      lastWatched: DateTime.tryParse(json['lastWatched'] as String? ?? '') ??
          DateTime.fromMillisecondsSinceEpoch(0),
      episodeTitle: json['episodeTitle'] as String?,
      seriesId: json['seriesId'] as int?,
      seasonNumber: json['seasonNumber'] as int?,
      episodeNumber: json['episodeNumber'] as int?,
      posterUrl: json['posterUrl'] as String?,
      backdropUrl: json['backdropUrl'] as String?,
    );
  }
}

/// Connection state for the API client.
enum ConnectionStatus { disconnected, connecting, connected, error }

class ApiClientState {
  const ApiClientState({
    this.status = ConnectionStatus.disconnected,
    this.baseUrl,
    this.lastError,
    this.serverVersion,
  });

  final ConnectionStatus status;
  final String? baseUrl;
  final String? lastError;
  final String? serverVersion;

  ApiClientState copyWith({
    ConnectionStatus? status,
    String? baseUrl,
    String? lastError,
    String? serverVersion,
  }) {
    return ApiClientState(
      status: status ?? this.status,
      baseUrl: baseUrl ?? this.baseUrl,
      lastError: lastError,
      serverVersion: serverVersion ?? this.serverVersion,
    );
  }
}

/// Mediarr API client. Wraps Dio for HTTP requests.
class MediarrApiClient extends StateNotifier<ApiClientState> {
  MediarrApiClient({Dio? dio})
      : _dio = dio ?? Dio(),
        super(const ApiClientState());

  final Dio _dio;
  Timer? _healthTimer;

  /// Connect to a server at the given base URL.
  Future<bool> connect(String baseUrl) async {
    state = state.copyWith(
      status: ConnectionStatus.connecting,
      baseUrl: baseUrl,
    );

    _dio.options.baseUrl = baseUrl;
    _dio.options.connectTimeout = const Duration(seconds: 5);
    _dio.options.receiveTimeout = const Duration(seconds: 30);

    try {
      final status = await getSystemStatus();
      if (status != null) {
        state = state.copyWith(
          status: ConnectionStatus.connected,
          serverVersion: status.version,
        );
        _startHealthCheck();
        return true;
      }
      state = state.copyWith(
        status: ConnectionStatus.error,
        lastError: 'Server returned invalid status',
      );
      return false;
    } catch (e) {
      state = state.copyWith(
        status: ConnectionStatus.error,
        lastError: e.toString(),
      );
      return false;
    }
  }

  /// Disconnect and stop health checking.
  void disconnect() {
    _healthTimer?.cancel();
    _healthTimer = null;
    state = const ApiClientState();
  }

  void _startHealthCheck() {
    _healthTimer?.cancel();
    _healthTimer = Timer.periodic(const Duration(seconds: 30), (_) async {
      try {
        await getSystemStatus();
        if (state.status != ConnectionStatus.connected) {
          state = state.copyWith(status: ConnectionStatus.connected);
        }
      } catch (_) {
        state = state.copyWith(status: ConnectionStatus.error);
      }
    });
  }

  // --- Helpers ---

  /// Decode raw response data (handles String or already-decoded Map/List).
  dynamic _decode(dynamic rawData) {
    if (rawData is String) return jsonDecode(rawData);
    return rawData;
  }

  /// Unwrap the server envelope: {ok: true, data: ...} → data
  dynamic _unwrap(dynamic rawData) {
    final raw = _decode(rawData);
    if (raw is Map<String, dynamic> && raw.containsKey('data')) {
      return raw['data'];
    }
    return raw;
  }

  // --- API Methods ---

  Future<SystemStatus?> getSystemStatus() async {
    final response = await _dio.get('/api/system/status');
    if (response.statusCode == 200 && response.data != null) {
      final data = _decode(response.data);
      return SystemStatus.fromJson(data as Map<String, dynamic>);
    }
    return null;
  }

  /// Fetch ALL movies from the library (handles server pagination).
  /// The server returns {ok, data: {items: [...], pagination: {page, pageSize, totalCount}}}.
  Future<List<Movie>> getMovies() async {
    return _fetchAllPaginated(
      '/api/movies',
      (json) => Movie.fromJson(json as Map<String, dynamic>),
    );
  }

  Future<Movie?> getMovie(int id) async {
    final response = await _dio.get('/api/movies/$id');
    if (response.statusCode == 200 && response.data != null) {
      final data = _unwrap(response.data);
      return Movie.fromJson(data as Map<String, dynamic>);
    }
    return null;
  }

  Future<PlaybackManifest?> getPlaybackManifest({
    required int mediaId,
    required String type,
    String? userId,
  }) async {
    final queryParameters = <String, dynamic>{'type': type};
    if (userId != null && userId.trim().isNotEmpty) {
      queryParameters['userId'] = userId.trim();
    }

    final response = await _dio.get(
      '/api/playback/$mediaId',
      queryParameters: queryParameters,
    );
    if (response.statusCode == 200 && response.data != null) {
      final data = _unwrap(response.data);
      return PlaybackManifest.fromJson(data as Map<String, dynamic>);
    }
    return null;
  }

  Future<List<ContinueWatchingItem>> getContinueWatching({int limit = 20}) async {
    final response = await _dio.get(
      '/api/playback/continue-watching',
      queryParameters: {'limit': limit},
    );
    if (response.statusCode == 200 && response.data != null) {
      final data = _unwrap(response.data);
      if (data is List) {
        return data
            .map((item) => ContinueWatchingItem.fromJson(item as Map<String, dynamic>))
            .toList();
      }
    }
    return const [];
  }

  /// Fetch ALL series from the library (handles server pagination).
  Future<List<Series>> getSeries() async {
    return _fetchAllPaginated(
      '/api/series',
      (json) => Series.fromJson(json as Map<String, dynamic>),
    );
  }

  /// Fetch full series detail with nested seasons and episodes.
  Future<Series?> getSeriesDetail(int id) async {
    final response = await _dio.get('/api/series/$id');
    if (response.statusCode == 200 && response.data != null) {
      final data = _unwrap(response.data);
      return Series.fromJson(data as Map<String, dynamic>);
    }
    return null;
  }

  /// Search for movies and series by query term.
  Future<List<SearchResult>> search(String query, {String? mediaType}) async {
    final queryParams = <String, dynamic>{'term': query};
    if (mediaType != null) {
      queryParams['mediaType'] = mediaType;
    }
    final response = await _dio.get('/api/search', queryParameters: queryParams);
    if (response.statusCode == 200 && response.data != null) {
      final data = _unwrap(response.data);
      if (data is List) {
        return data
            .map((item) => SearchResult.fromJson(item as Map<String, dynamic>))
            .toList();
      }
    }
    return const [];
  }

  /// Search for releases (torrents) matching a search result.
  Future<List<Release>> searchReleases({
    String? query,
    String? type,
    int? tmdbId,
    int? tvdbId,
    int? year,
    int? qualityProfileId,
  }) async {
    final body = <String, dynamic>{};
    if (query != null) body['query'] = query;
    if (type != null) body['type'] = type;
    if (tmdbId != null) body['tmdbId'] = tmdbId;
    if (tvdbId != null) body['tvdbId'] = tvdbId;
    if (year != null) body['year'] = year;
    if (qualityProfileId != null) body['qualityProfileId'] = qualityProfileId;

    final response = await _dio.post('/api/releases/search', data: body);
    if (response.statusCode == 200 && response.data != null) {
      final data = _unwrap(response.data);
      if (data is Map<String, dynamic> && data['items'] is List) {
        return (data['items'] as List)
            .map((item) => Release.fromJson(item as Map<String, dynamic>))
            .toList();
      }
      if (data is List) {
        return data
            .map((item) => Release.fromJson(item as Map<String, dynamic>))
            .toList();
      }
    }
    return const [];
  }

  /// Grab a specific release by GUID and indexer ID.
  Future<void> grabRelease({
    required String guid,
    required int indexerId,
    int? downloadClientId,
  }) async {
    final body = <String, dynamic>{
      'guid': guid,
      'indexerId': indexerId,
    };
    if (downloadClientId != null) {
      body['downloadClientId'] = downloadClientId;
    }
    await _dio.post('/api/releases/grab', data: body);
  }

  /// Add a movie to the library.
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
    await _dio.post('/api/media', data: {
      'mediaType': 'MOVIE',
      'tmdbId': tmdbId,
      'title': title,
      'year': year,
      'qualityProfileId': qualityProfileId ?? 1,
      'monitored': monitored,
      'searchNow': searchNow,
      if (overview != null) 'overview': overview,
      if (posterUrl != null) 'posterUrl': posterUrl,
      if (imdbId != null) 'imdbId': imdbId,
    });
  }

  /// Add a series to the library.
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
    await _dio.post('/api/media', data: {
      'mediaType': 'TV',
      'tvdbId': tvdbId,
      'title': title,
      'year': year,
      'qualityProfileId': qualityProfileId ?? 1,
      'monitored': monitored,
      'searchNow': searchNow,
      if (overview != null) 'overview': overview,
      if (posterUrl != null) 'posterUrl': posterUrl,
      if (tmdbId != null) 'tmdbId': tmdbId,
      if (imdbId != null) 'imdbId': imdbId,
    });
  }

  /// Report playback position to the server.
  /// Server expects: {type, mediaId, position (seconds), duration (seconds)}
  Future<void> reportPlaybackProgress({
    required int mediaId,
    required String type,
    required int positionSeconds,
    required int durationSeconds,
  }) async {
    await _dio.post('/api/playback/progress', data: {
      'type': type,
      'mediaId': mediaId,
      'position': positionSeconds,
      'duration': durationSeconds,
    });
  }

  /// Get the streaming URL for a media item by its ID and type.
  /// Server uses: GET /api/stream/:id?type=movie|episode
  String getStreamUrl(int mediaId, String type) {
    return '${state.baseUrl}/api/stream/$mediaId?type=$type';
  }

  /// Fetch all pages for a paginated endpoint.
  /// Requests pageSize=500 to minimize round-trips for large libraries.
  Future<List<T>> _fetchAllPaginated<T>(
    String path,
    T Function(dynamic json) fromJson,
  ) async {
    const pageSize = 500;
    final allItems = <T>[];
    var page = 1;

    while (true) {
      final response = await _dio.get(path, queryParameters: {
        'page': page,
        'pageSize': pageSize,
      });

      if (response.statusCode != 200 || response.data == null) break;

      final envelope = _unwrap(response.data);

      // The server returns either {items: [...], pagination: {...}}
      // or a flat list depending on the endpoint.
      List<dynamic> items;
      int totalCount;

      if (envelope is Map<String, dynamic> &&
          envelope.containsKey('items')) {
        items = envelope['items'] as List<dynamic>;
        final pagination =
            envelope['pagination'] as Map<String, dynamic>?;
        totalCount = (pagination?['totalCount'] as int?) ?? items.length;
      } else if (envelope is List) {
        items = envelope;
        totalCount = items.length;
      } else {
        break;
      }

      allItems.addAll(items.map(fromJson));

      // If we've fetched everything, stop
      if (allItems.length >= totalCount || items.length < pageSize) {
        break;
      }
      page++;
    }

    return allItems;
  }

  @override
  void dispose() {
    _healthTimer?.cancel();
    super.dispose();
  }
}

/// Provider for the API client.
final apiClientProvider =
    StateNotifierProvider<MediarrApiClient, ApiClientState>((ref) {
  return MediarrApiClient();
});
