import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:media_kit/media_kit.dart';

import '../../shared/services/api_client.dart';
import 'media_player.dart';
import 'subtitle_renderer.dart';
import 'track_selection.dart';

/// Playback state.
enum PlaybackStatus { idle, loading, playing, paused, buffering, error, completed }

Duration normalizeResumeOffset(Duration resumeFrom) =>
    resumeFrom < Duration.zero ? Duration.zero : resumeFrom;

/// Nudge steps supported by the playback UI (FR-7).
///
/// Subtitle timing nudge is Kodi-style: ±5s, ±1s, ±0.5s, plus a reset.
const List<Duration> subtitleNudgeSteps = <Duration>[
  Duration(milliseconds: -5000),
  Duration(milliseconds: -1000),
  Duration(milliseconds: -500),
  Duration(milliseconds: 500),
  Duration(milliseconds: 1000),
  Duration(milliseconds: 5000),
];

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
    this.audioTracks = const [],
    this.subtitleTracks = const [],
    this.selectedAudioIndex,
    this.selectedSubtitleIndex,
    this.subtitleDelay = Duration.zero,
    this.subtitleDelayToast,
    // Hidden by default: the transport overlay appears via `showOverlay()`
    // (startup and every input) and hides on its 4 s window (FR-7). A `true`
    // default created a spurious hide transition during playback start, which
    // parked focus on the key handler instead of the overlay's controls.
    this.overlayVisible = false,
  });

  final PlaybackStatus status;
  final String? mediaTitle;
  final int? mediaId;
  final String? mediaType;
  final Duration position;
  final Duration duration;
  final Duration buffered;
  final String? error;
  final List<AudioTrackInfo> audioTracks;
  final List<SubtitleTrackInfo> subtitleTracks;
  final int? selectedAudioIndex;
  final int? selectedSubtitleIndex;
  final Duration subtitleDelay;
  final String? subtitleDelayToast;
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
    List<AudioTrackInfo>? audioTracks,
    List<SubtitleTrackInfo>? subtitleTracks,
    int? selectedAudioIndex,
    int? selectedSubtitleIndex,
    bool clearSelectedAudioIndex = false,
    bool clearSelectedSubtitleIndex = false,
    Duration? subtitleDelay,
    String? subtitleDelayToast,
    bool clearSubtitleDelayToast = false,
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
      error: error,
      audioTracks: audioTracks ?? this.audioTracks,
      subtitleTracks: subtitleTracks ?? this.subtitleTracks,
      selectedAudioIndex: clearSelectedAudioIndex
          ? null
          : (selectedAudioIndex ?? this.selectedAudioIndex),
      selectedSubtitleIndex: clearSelectedSubtitleIndex
          ? null
          : (selectedSubtitleIndex ?? this.selectedSubtitleIndex),
      subtitleDelay: subtitleDelay ?? this.subtitleDelay,
      subtitleDelayToast:
          clearSubtitleDelayToast ? null : (subtitleDelayToast ?? this.subtitleDelayToast),
      overlayVisible: overlayVisible ?? this.overlayVisible,
    );
  }
}

/// Manages media playback.
///
/// FR-6: on every `play()`, when the player discovers tracks, the service
/// silently selects English audio + Chinese Simplified subs. Manual picker
/// is reachable through `selectAudio` / `selectSubtitle`.
///
/// FR-7: subtitle timing nudge is exposed via `nudgeSubtitleDelay` /
/// `resetSubtitleDelay`. Offset is per-session (per `play()` call) and is
/// cleared whenever a different media item starts.
class PlaybackService extends StateNotifier<PlaybackState> {
  PlaybackService(
    this._apiClient, {
    MediaPlayer? player,
    SubtitleRenderer? subtitleRenderer,
  }) : super(const PlaybackState()) {
    final defaultPlayer = player ?? MediaKitMediaPlayer();
    _player = defaultPlayer;
    _subtitleRenderer = subtitleRenderer ??
        (defaultPlayer is MediaKitMediaPlayer
            ? MediaKitSubtitleRenderer(defaultPlayer.player)
            : NoOpSubtitleRenderer());
    _listenToPlayer();
  }

  final MediarrApiClient _apiClient;
  late final MediaPlayer _player;
  late final SubtitleRenderer _subtitleRenderer;
  Timer? _progressReportTimer;
  Timer? _overlayHideTimer;
  Timer? _subtitleToastTimer;

  /// Returns the underlying `media_kit` `Player` if this service was
  /// constructed with a `MediaKitMediaPlayer`. The playback screen uses
  /// this to attach a `VideoController` to the same instance.
  ///
  /// Throws when the service was constructed with a custom [MediaPlayer]
  /// (e.g. tests injecting a `FakeMediaPlayer`). Callers that need to
  /// attach a `VideoController` must do so on the production path.
  Player get player {
    final mp = _player;
    if (mp is MediaKitMediaPlayer) return mp.player;
    throw StateError(
      'PlaybackService was not constructed with MediaKitMediaPlayer; '
      'cannot expose a media_kit Player.',
    );
  }

  /// Start playing a media item.
  Future<void> play({
    required String streamUrl,
    required String title,
    required int mediaId,
    required String mediaType,
    Duration resumeFrom = Duration.zero,
    List<ExternalSubtitleSource> externalSubtitles = const [],
  }) async {
    final startPosition = normalizeResumeOffset(resumeFrom);

    // Per-media reset of subtitle timing nudge (FR-7).
    await _subtitleRenderer.setDelay(Duration.zero);
    _subtitleToastTimer?.cancel();

    state = state.copyWith(
      status: PlaybackStatus.loading,
      mediaTitle: title,
      mediaId: mediaId,
      mediaType: mediaType,
      position: startPosition,
      duration: Duration.zero,
      error: null,
      audioTracks: const [],
      subtitleTracks: const [],
      clearSelectedAudioIndex: true,
      clearSelectedSubtitleIndex: true,
      subtitleDelay: Duration.zero,
      clearSubtitleDelayToast: true,
    );

    try {
      await _player.open(streamUrl);
      await _player.attachExternalSubtitles(externalSubtitles);
      if (startPosition > Duration.zero) {
        await _player.seek(startPosition);
      }
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
  Future<void> togglePlayPause() async {
    _touchOverlay();
    await _player.playOrPause();
  }

  /// Seek to a specific position.
  Future<void> seekTo(Duration position) async {
    _touchOverlay();
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
  ///
  /// Phase 4b+ follow-up: stop() must NOT close the underlying media_kit
  /// stream surface so a subsequent [play] reopens cleanly without the
  /// "playback breaks after one exit" regression. We report progress, hide
  /// the overlay, and reset the state machine so a second play() starts
  /// from a clean slate.
  Future<void> stop() async {
    _progressReportTimer?.cancel();
    _overlayHideTimer?.cancel();
    _subtitleToastTimer?.cancel();

    // Report final position
    try {
      await _reportProgress();
    } catch (_) {}

    try {
      await _player.stop();
    } catch (_) {}

    state = const PlaybackState(overlayVisible: false);
  }

  /// Reset transient playback state to a clean slate before opening a new
  /// stream. Used by [PlaybackScreen] before each `play()` call so a
  /// play → exit → play sequence starts from a known-good state (status
  /// loading, no stale tracks, overlay hidden, subtitle reset to 0).
  void resetForNewPlayback() {
    _progressReportTimer?.cancel();
    _overlayHideTimer?.cancel();
    _subtitleToastTimer?.cancel();
    state = const PlaybackState(overlayVisible: false);
  }

  /// Show the overlay and restart the auto-hide timer.
  void showOverlay() {
    state = state.copyWith(overlayVisible: true);
    _startOverlayTimer();
  }

  /// Hide the overlay without affecting playback.
  void hideOverlay() {
    _overlayHideTimer?.cancel();
    if (state.overlayVisible) {
      state = state.copyWith(overlayVisible: false);
    }
  }

  /// Toggle overlay visibility.
  void toggleOverlay() {
    if (state.overlayVisible) {
      hideOverlay();
    } else {
      showOverlay();
    }
  }

  /// Select a subtitle track by index (`null` to disable).
  ///
  /// Manual picker hook. The default selection happens silently in
  /// [_onTracks] when tracks arrive.
  void selectSubtitle(int? index) {
    final tracks = state.subtitleTracks;
    if (index != null && index < tracks.length) {
      state = state.copyWith(selectedSubtitleIndex: index);
      _player.setSubtitleTrack(tracks[index].id);
    } else {
      state = state.copyWith(clearSelectedSubtitleIndex: true);
      _player.setSubtitleTrack(null);
    }
  }

  /// Select an audio track by index. `null` falls back to the player's
  /// default selection.
  void selectAudio(int? index) {
    final tracks = state.audioTracks;
    if (index != null && index < tracks.length) {
      state = state.copyWith(selectedAudioIndex: index);
      _player.setAudioTrack(tracks[index].id);
    } else {
      state = state.copyWith(clearSelectedAudioIndex: true);
      _player.setAudioTrack(null);
    }
  }

  /// Shift the subtitle timing by [step] (FR-7).
  ///
  /// Steps are clamped to a sane Kodi-style range (±60s) to prevent runaway
  /// accumulation from accidental double-taps. The toast label is set and
  /// cleared automatically after a short interval.
  Future<void> nudgeSubtitleDelay(Duration step) async {
    _touchOverlay();
    final next = state.subtitleDelay + step;
    final clamped = next < const Duration(seconds: -60)
        ? const Duration(seconds: -60)
        : (next > const Duration(seconds: 60)
            ? const Duration(seconds: 60)
            : next);
    state = state.copyWith(
      subtitleDelay: clamped,
      subtitleDelayToast: SubtitleDelay.format(clamped),
    );
    await _subtitleRenderer.setDelay(clamped);
    _startSubtitleToastTimer();
  }

  /// Reset the subtitle timing offset back to 0 (FR-7).
  Future<void> resetSubtitleDelay() async {
    _touchOverlay();
    state = state.copyWith(
      subtitleDelay: Duration.zero,
      clearSubtitleDelayToast: true,
    );
    await _subtitleRenderer.setDelay(Duration.zero);
  }

  void _listenToPlayer() {
    _player.status.listen((status) {
      switch (status) {
        case MediaPlayerStatus.playing:
          state = state.copyWith(status: PlaybackStatus.playing);
          break;
        case MediaPlayerStatus.paused:
          if (state.status == PlaybackStatus.playing) {
            state = state.copyWith(status: PlaybackStatus.paused);
          }
          break;
        case MediaPlayerStatus.buffering:
          state = state.copyWith(status: PlaybackStatus.buffering);
          break;
        case MediaPlayerStatus.completed:
          state = state.copyWith(status: PlaybackStatus.completed);
          _progressReportTimer?.cancel();
          break;
        case MediaPlayerStatus.opening:
        case MediaPlayerStatus.idle:
          // No-op for the state.
          break;
      }
    });

    _player.position.listen((position) {
      state = state.copyWith(position: position);
    });

    _player.duration.listen((duration) {
      state = state.copyWith(duration: duration);
    });

    _player.errors.listen((error) {
      state = state.copyWith(
        status: PlaybackStatus.error,
        error: error,
      );
    });

    _player.tracks.listen(_onTracks);
  }

  void _onTracks(MediaTrackLists lists) {
    final audioIndex = selectDefaultAudioTrackIndex(lists.audio);
    final subtitleIndex = selectDefaultSubtitleTrackIndex(lists.subtitle);

    state = state.copyWith(
      audioTracks: lists.audio,
      subtitleTracks: lists.subtitle,
      selectedAudioIndex: audioIndex,
      selectedSubtitleIndex: subtitleIndex,
    );

    if (audioIndex != null) {
      _player.setAudioTrack(lists.audio[audioIndex].id);
    }
    if (subtitleIndex != null) {
      _player.setSubtitleTrack(lists.subtitle[subtitleIndex].id);
    } else {
      // No Chinese Simplified subtitle → explicitly disable subtitles so the
      // player doesn't fall back to a non-zho track silently.
      _player.setSubtitleTrack(null);
    }
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
    _overlayHideTimer = Timer(const Duration(seconds: 4), () {
      // FR-7: hide 4 s after the last input whatever the play state. The old
      // `status == playing` guard made this a one-shot that missed its window
      // on any buffering blip and never re-armed, so the overlay stayed up.
      if (state.overlayVisible) {
        state = state.copyWith(overlayVisible: false);
      }
    });
  }

  /// FR-7: every transport input restarts the auto-hide window.
  void _touchOverlay() => _startOverlayTimer();

  void _startSubtitleToastTimer() {
    _subtitleToastTimer?.cancel();
    _subtitleToastTimer = Timer(const Duration(seconds: 2), () {
      state = state.copyWith(clearSubtitleDelayToast: true);
    });
  }

  @override
  void dispose() {
    _progressReportTimer?.cancel();
    _overlayHideTimer?.cancel();
    _subtitleToastTimer?.cancel();
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
