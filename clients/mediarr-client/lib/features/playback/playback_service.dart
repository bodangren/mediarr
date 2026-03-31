import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:media_kit/media_kit.dart';

import '../../shared/services/api_client.dart';

/// Playback state.
enum PlaybackStatus { idle, loading, playing, paused, buffering, error, completed }

/// Immutable playback state.
class PlaybackState {
  const PlaybackState({
    this.status = PlaybackStatus.idle,
    this.mediaTitle,
    this.mediaId,
    this.mediaType,
    this.position = Duration.zero,
    this.duration = Duration.zero,
    this.buffered = Duration.zero,
    this.error,
    this.subtitleTracks = const [],
    this.selectedSubtitleIndex,
    this.overlayVisible = true,
  });

  final PlaybackStatus status;
  final String? mediaTitle;
  final int? mediaId;
  final String? mediaType;
  final Duration position;
  final Duration duration;
  final Duration buffered;
  final String? error;
  final List<String> subtitleTracks;
  final int? selectedSubtitleIndex;
  final bool overlayVisible;

  double get progress =>
      duration.inMilliseconds > 0
          ? position.inMilliseconds / duration.inMilliseconds
          : 0.0;

  PlaybackState copyWith({
    PlaybackStatus? status,
    String? mediaTitle,
    int? mediaId,
    String? mediaType,
    Duration? position,
    Duration? duration,
    Duration? buffered,
    String? error,
    List<String>? subtitleTracks,
    int? selectedSubtitleIndex,
    bool? overlayVisible,
  }) {
    return PlaybackState(
      status: status ?? this.status,
      mediaTitle: mediaTitle ?? this.mediaTitle,
      mediaId: mediaId ?? this.mediaId,
      mediaType: mediaType ?? this.mediaType,
      position: position ?? this.position,
      duration: duration ?? this.duration,
      buffered: buffered ?? this.buffered,
      error: error ?? this.error,
      subtitleTracks: subtitleTracks ?? this.subtitleTracks,
      selectedSubtitleIndex: selectedSubtitleIndex ?? this.selectedSubtitleIndex,
      overlayVisible: overlayVisible ?? this.overlayVisible,
    );
  }
}

/// Manages media playback via media_kit.
class PlaybackService extends StateNotifier<PlaybackState> {
  PlaybackService(this._apiClient) : super(const PlaybackState()) {
    _player = Player();
    _listenToPlayer();
  }

  final MediarrApiClient _apiClient;
  late final Player _player;
  Timer? _progressReportTimer;
  Timer? _overlayHideTimer;

  Player get player => _player;

  /// Start playing a media item.
  Future<void> play({
    required String streamUrl,
    required String title,
    required int mediaId,
    required String mediaType,
  }) async {
    state = state.copyWith(
      status: PlaybackStatus.loading,
      mediaTitle: title,
      mediaId: mediaId,
      mediaType: mediaType,
      position: Duration.zero,
      duration: Duration.zero,
      error: null,
    );

    try {
      await _player.open(Media(streamUrl));
      _startProgressReporting();
      _startOverlayTimer();
    } catch (e) {
      state = state.copyWith(
        status: PlaybackStatus.error,
        error: e.toString(),
      );
    }
  }

  /// Toggle play/pause.
  void togglePlayPause() {
    _player.playOrPause();
  }

  /// Seek to a specific position.
  Future<void> seekTo(Duration position) async {
    await _player.seek(position);
    state = state.copyWith(position: position);
  }

  /// Seek relative to current position.
  Future<void> seekRelative(Duration offset) async {
    final target = state.position + offset;
    final clamped = target < Duration.zero
        ? Duration.zero
        : (target > state.duration ? state.duration : target);
    await seekTo(clamped);
  }

  /// Stop playback and report final position.
  Future<void> stop() async {
    _progressReportTimer?.cancel();
    _overlayHideTimer?.cancel();

    // Report final position
    await _reportProgress();

    await _player.stop();
    state = const PlaybackState();
  }

  /// Show the overlay and restart the auto-hide timer.
  void showOverlay() {
    state = state.copyWith(overlayVisible: true);
    _startOverlayTimer();
  }

  /// Toggle overlay visibility.
  void toggleOverlay() {
    if (state.overlayVisible) {
      _overlayHideTimer?.cancel();
      state = state.copyWith(overlayVisible: false);
    } else {
      showOverlay();
    }
  }

  /// Select a subtitle track by index (null to disable).
  void selectSubtitle(int? index) {
    state = state.copyWith(selectedSubtitleIndex: index);
    if (index != null && index < _player.state.tracks.subtitle.length) {
      _player.setSubtitleTrack(_player.state.tracks.subtitle[index]);
    } else {
      _player.setSubtitleTrack(SubtitleTrack.no());
    }
  }

  void _listenToPlayer() {
    _player.stream.playing.listen((playing) {
      if (playing) {
        state = state.copyWith(status: PlaybackStatus.playing);
      } else if (state.status == PlaybackStatus.playing) {
        state = state.copyWith(status: PlaybackStatus.paused);
      }
    });

    _player.stream.position.listen((position) {
      state = state.copyWith(position: position);
    });

    _player.stream.duration.listen((duration) {
      state = state.copyWith(duration: duration);
    });

    _player.stream.buffering.listen((buffering) {
      if (buffering) {
        state = state.copyWith(status: PlaybackStatus.buffering);
      } else if (state.status == PlaybackStatus.buffering) {
        state = state.copyWith(status: PlaybackStatus.playing);
      }
    });

    _player.stream.completed.listen((completed) {
      if (completed) {
        state = state.copyWith(status: PlaybackStatus.completed);
        _progressReportTimer?.cancel();
      }
    });

    _player.stream.error.listen((error) {
      state = state.copyWith(
        status: PlaybackStatus.error,
        error: error,
      );
    });

    _player.stream.tracks.listen((tracks) {
      final subs = tracks.subtitle
          .map((t) => t.title ?? t.language ?? t.id)
          .toList();
      state = state.copyWith(subtitleTracks: subs);
    });
  }

  void _startProgressReporting() {
    _progressReportTimer?.cancel();
    _progressReportTimer = Timer.periodic(
      const Duration(seconds: 10),
      (_) => _reportProgress(),
    );
  }

  Future<void> _reportProgress() async {
    final id = state.mediaId;
    final type = state.mediaType;
    if (id == null || type == null) return;
    if (state.position == Duration.zero && state.duration == Duration.zero) {
      return;
    }

    try {
      await _apiClient.reportPlaybackProgress(
        mediaId: id,
        type: type,
        positionSeconds: state.position.inSeconds,
        durationSeconds: state.duration.inSeconds,
      );
    } catch (_) {
      // Best-effort — don't interrupt playback for sync failures
    }
  }

  void _startOverlayTimer() {
    _overlayHideTimer?.cancel();
    _overlayHideTimer = Timer(const Duration(seconds: 5), () {
      if (state.status == PlaybackStatus.playing) {
        state = state.copyWith(overlayVisible: false);
      }
    });
  }

  @override
  void dispose() {
    _progressReportTimer?.cancel();
    _overlayHideTimer?.cancel();
    _player.dispose();
    super.dispose();
  }
}

/// Provider for the playback service.
final playbackServiceProvider =
    StateNotifierProvider<PlaybackService, PlaybackState>((ref) {
  final apiClient = ref.read(apiClientProvider.notifier);
  return PlaybackService(apiClient);
});
