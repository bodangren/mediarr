import 'dart:async';
import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/movie.dart';
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
