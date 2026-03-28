import 'dart:async';
import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/episode.dart';
import '../models/movie.dart';
import '../models/season.dart';
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
  });

  final ConnectionStatus status;
  final String? baseUrl;
  final String? lastError;

  ApiClientState copyWith({
    ConnectionStatus? status,
    String? baseUrl,
    String? lastError,
  }) {
    return ApiClientState(
      status: status ?? this.status,
      baseUrl: baseUrl ?? this.baseUrl,
      lastError: lastError,
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
    _dio.options.receiveTimeout = const Duration(seconds: 10);

    try {
      final status = await getSystemStatus();
      if (status != null) {
        state = state.copyWith(status: ConnectionStatus.connected);
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

  // --- API Methods ---

  Future<SystemStatus?> getSystemStatus() async {
    final response = await _dio.get('/api/system/status');
    if (response.statusCode == 200 && response.data != null) {
      final data = response.data is String
          ? jsonDecode(response.data as String)
          : response.data;
      return SystemStatus.fromJson(data as Map<String, dynamic>);
    }
    return null;
  }

  Future<List<Movie>> getMovies() async {
    final response = await _dio.get('/api/movies');
    if (response.statusCode == 200 && response.data != null) {
      final raw = response.data is String
          ? jsonDecode(response.data as String)
          : response.data;
      final data = raw is Map<String, dynamic> ? raw['data'] ?? raw : raw;
      return (data as List)
          .map((json) => Movie.fromJson(json as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  Future<Movie?> getMovie(int id) async {
    final response = await _dio.get('/api/movies/$id');
    if (response.statusCode == 200 && response.data != null) {
      final data = response.data is String
          ? jsonDecode(response.data as String)
          : response.data;
      return Movie.fromJson(data as Map<String, dynamic>);
    }
    return null;
  }

  Future<List<Series>> getSeries() async {
    final response = await _dio.get('/api/series');
    if (response.statusCode == 200 && response.data != null) {
      final raw = response.data is String
          ? jsonDecode(response.data as String)
          : response.data;
      final data = raw is Map<String, dynamic> ? raw['data'] ?? raw : raw;
      return (data as List)
          .map((json) => Series.fromJson(json as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  Future<Series?> getSeriesById(int id) async {
    final response = await _dio.get('/api/series/$id');
    if (response.statusCode == 200 && response.data != null) {
      final data = response.data is String
          ? jsonDecode(response.data as String)
          : response.data;
      return Series.fromJson(data as Map<String, dynamic>);
    }
    return null;
  }

  Future<List<Season>> getSeasons(int seriesId) async {
    final response = await _dio.get('/api/series/$seriesId/seasons');
    if (response.statusCode == 200 && response.data != null) {
      final raw = response.data is String
          ? jsonDecode(response.data as String)
          : response.data;
      final data = raw is Map<String, dynamic> ? raw['data'] ?? raw : raw;
      return (data as List)
          .map((json) => Season.fromJson(json as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  Future<List<Episode>> getEpisodes(int seriesId, {int? seasonNumber}) async {
    String path = '/api/series/$seriesId/episodes';
    if (seasonNumber != null) {
      path += '?seasonNumber=$seasonNumber';
    }
    final response = await _dio.get(path);
    if (response.statusCode == 200 && response.data != null) {
      final raw = response.data is String
          ? jsonDecode(response.data as String)
          : response.data;
      final data = raw is Map<String, dynamic> ? raw['data'] ?? raw : raw;
      return (data as List)
          .map((json) => Episode.fromJson(json as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  /// Report playback position to the server.
  Future<void> reportPlaybackProgress({
    required int mediaId,
    required String mediaType,
    required int positionMs,
    required int durationMs,
  }) async {
    await _dio.post('/api/playback/progress', data: {
      'mediaId': mediaId,
      'mediaType': mediaType,
      'positionMs': positionMs,
      'durationMs': durationMs,
    });
  }

  /// Get last playback position for a media item.
  Future<int?> getPlaybackProgress(int mediaId, String mediaType) async {
    try {
      final response = await _dio.get(
        '/api/playback/progress',
        queryParameters: {'mediaId': mediaId, 'mediaType': mediaType},
      );
      if (response.statusCode == 200 && response.data != null) {
        final data = response.data is String
            ? jsonDecode(response.data as String)
            : response.data;
        return (data as Map<String, dynamic>)['positionMs'] as int?;
      }
    } catch (_) {
      // Playback progress is best-effort
    }
    return null;
  }

  /// Get the streaming URL for a media file.
  String getStreamUrl(String filePath) {
    final encoded = Uri.encodeComponent(filePath);
    return '${state.baseUrl}/api/stream?path=$encoded';
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
