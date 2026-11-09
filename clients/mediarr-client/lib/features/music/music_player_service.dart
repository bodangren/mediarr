import 'dart:async';
import 'dart:math';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:media_kit/media_kit.dart';

import '../../shared/models/music.dart';
import '../../shared/services/api_client.dart';
import 'music_resume_store.dart';

enum MusicRepeatMode { off, all, one }

/// Deterministic-ish shuffle: the current track stays first, the rest are Fisher-Yates shuffled.
/// Exposed for unit tests so the queue-mode rules are not buried in the player.
List<MusicTrack> buildShuffledOrder(
  List<MusicTrack> canonical,
  int currentIndex, [
  Random? random,
]) {
  if (canonical.isEmpty) return const [];
  final rng = random ?? Random();
  final current = canonical[currentIndex.clamp(0, canonical.length - 1)];
  final rest = [
    for (var i = 0; i < canonical.length; i++)
      if (i != currentIndex.clamp(0, canonical.length - 1)) canonical[i],
  ];
  for (var i = rest.length - 1; i > 0; i--) {
    final j = rng.nextInt(i + 1);
    final tmp = rest[i];
    rest[i] = rest[j];
    rest[j] = tmp;
  }
  return [current, ...rest];
}

/// Index to play next, or null when playback should stop (repeat off at the end).
int? nextQueueIndex({
  required int index,
  required int length,
  required MusicRepeatMode repeat,
}) {
  if (length <= 0) return null;
  if (index + 1 < length) return index + 1;
  return repeat == MusicRepeatMode.all ? 0 : null;
}

int? previousQueueIndex({
  required int index,
  required int length,
  required MusicRepeatMode repeat,
}) {
  if (length <= 0) return null;
  if (index > 0) return index - 1;
  return repeat == MusicRepeatMode.all ? length - 1 : null;
}

/// Audio playback for the Music library (track feature_music_library_20261107, Phase 4).
///
/// Owns the media_kit audio player and a simple queue. Deliberately separate from PlaybackService:
/// music has no video surface, no subtitle overlay and no movie/episode progress rows.
class MusicPlaybackState {
  const MusicPlaybackState({
    this.queue = const [],
    this.index,
    this.isPlaying = false,
    this.position = Duration.zero,
    this.duration = Duration.zero,
    this.error,
    this.shuffle = false,
    this.repeatMode = MusicRepeatMode.off,
  });

  final List<MusicTrack> queue;
  final int? index;
  final bool isPlaying;
  final Duration position;
  final Duration duration;
  final String? error;
  final bool shuffle;
  final MusicRepeatMode repeatMode;

  MusicTrack? get current =>
      index == null || index! < 0 || index! >= queue.length ? null : queue[index!];

  MusicPlaybackState copyWith({
    List<MusicTrack>? queue,
    int? index,
    bool? isPlaying,
    Duration? position,
    Duration? duration,
    String? error,
    bool clearError = false,
    bool? shuffle,
    MusicRepeatMode? repeatMode,
  }) {
    return MusicPlaybackState(
      queue: queue ?? this.queue,
      index: index ?? this.index,
      isPlaying: isPlaying ?? this.isPlaying,
      position: position ?? this.position,
      duration: duration ?? this.duration,
      error: clearError ? null : (error ?? this.error),
      shuffle: shuffle ?? this.shuffle,
      repeatMode: repeatMode ?? this.repeatMode,
    );
  }
}

class MusicPlayerService extends Notifier<MusicPlaybackState> {
  Player? _player;
  final MusicResumeStore _resumeStore = MusicResumeStore();
  Timer? _resumeSaveTimer;
  String Function(int trackId)? _urlFor;
  final List<StreamSubscription<dynamic>> _subscriptions = [];
  /// Library order before shuffle, so toggling shuffle off restores it.
  List<MusicTrack>? _canonicalQueue;

  @override
  MusicPlaybackState build() {
    ref.onDispose(() {
      for (final subscription in _subscriptions) {
        unawaited(subscription.cancel());
      }
      _resumeSaveTimer?.cancel();
      unawaited(_persistResume());
      unawaited(_player?.dispose());
    });
    return const MusicPlaybackState();
  }

  Future<void> playQueue({
    required List<MusicTrack> tracks,
    required int index,
    required String Function(int trackId) urlFor,
    bool shuffle = false,
  }) async {
    if (tracks.isEmpty || index < 0 || index >= tracks.length) return;
    _urlFor = urlFor;
    if (shuffle) {
      _canonicalQueue = List<MusicTrack>.of(tracks);
      final shuffled = buildShuffledOrder(tracks, index);
      state = MusicPlaybackState(
        queue: shuffled,
        index: 0,
        isPlaying: false,
        shuffle: true,
        repeatMode: state.repeatMode,
      );
    } else {
      _canonicalQueue = null;
      state = MusicPlaybackState(
        queue: tracks,
        index: index,
        isPlaying: false,
        repeatMode: state.repeatMode,
      );
    }
    try {
      final player = _player ??= Player();
      if (_subscriptions.isEmpty) {
        _subscriptions.add(player.stream.playing.listen((value) {
          state = state.copyWith(isPlaying: value);
        }));
        _subscriptions.add(player.stream.position.listen((value) {
          state = state.copyWith(position: value);
        }));
        _subscriptions.add(player.stream.duration.listen((value) {
          state = state.copyWith(duration: value);
        }));
        _subscriptions.add(player.stream.error.listen((value) {
          state = state.copyWith(error: value);
        }));
        _subscriptions.add(player.stream.completed.listen((value) {
          if (value) {
            unawaited(_reportProgress());
            unawaited(next());
          }
        }));
      }
      final current = state.current;
      if (current == null) return;
      await player.open(Media(urlFor(current.id)));
      await player.play();
      _startResumeSaving();
    } catch (error) {
      state = state.copyWith(error: 'audio playback failed: $error');
    }
  }

  /// Reports the play position to the server so the weekly music-pick pass knows what was listened to.
  Future<void> _reportProgress() async {
    final current = state.current;
    if (current == null) return;
    final durationSeconds = state.duration.inSeconds;
    if (durationSeconds <= 0) return;
    try {
      await ref.read(apiClientProvider.notifier).reportMusicProgress(
            trackId: current.id,
            positionSeconds: state.position.inSeconds,
            durationSeconds: durationSeconds,
          );
    } catch (_) {
      // A failed heartbeat must never disturb playback; the resume snapshot is local and authoritative.
    }
  }

  /// Persists what is playing so the app can offer "Continue listening" after a restart.
  void _startResumeSaving() {
    _resumeSaveTimer ??= Timer.periodic(const Duration(seconds: 15), (_) => unawaited(_persistResume()));
    unawaited(_persistResume());
  }

  Future<void> _persistResume() async {
    final current = state.current;
    final index = state.index;
    if (current == null || index == null) return;
    unawaited(_reportProgress());
    await _resumeStore.save(MusicResumeSnapshot(
      tracks: state.queue,
      index: index,
      position: state.position,
      savedAt: DateTime.now(),
    ));
  }

  /// Restores a snapshot from a previous session: opens the same queue, then seeks once the stream
  /// has started (a seek before open is dropped by the player).
  Future<void> restoreSnapshot(MusicResumeSnapshot snapshot, {required String Function(int trackId) urlFor}) async {
    final current = snapshot.current;
    if (current == null) return;
    await playQueue(tracks: snapshot.tracks, index: snapshot.index, urlFor: urlFor);
    if (snapshot.position <= const Duration(seconds: 5)) return;
    await Future<void>.delayed(const Duration(milliseconds: 600));
    try {
      await _player?.seek(snapshot.position);
    } catch (_) {
      // Starting from the beginning is acceptable; resume is best effort.
    }
  }

  Future<void> toggle() async {
    try {
      await _player?.playOrPause();
    } catch (_) {
      // A dead audio output must not crash the shell.
    }
  }

  /// Pauses without clearing the queue (media Stop key and menu actions).
  Future<void> pause() async {
    try {
      await _player?.pause();
    } catch (_) {
      // Ignore a dead audio output.
    }
    await _persistResume();
  }

  /// Plays one track immediately, replacing the queue.
  Future<void> playNow({required MusicTrack track, required String Function(int trackId) urlFor}) async {
    await playQueue(tracks: [track], index: 0, urlFor: urlFor);
  }

  /// Queues a track right after the current one; with nothing playing it starts a new queue.
  Future<void> insertNext({
    required MusicTrack track,
    required String Function(int trackId) urlFor,
  }) async {
    final current = state.current;
    if (current == null) {
      await playQueue(tracks: [track], index: 0, urlFor: urlFor);
      return;
    }
    final queue = [...state.queue];
    final index = state.index ?? 0;
    queue.insert(index + 1, track);
    _urlFor = urlFor;
    state = state.copyWith(queue: queue);
  }

  Future<void> next() async {
    final index = state.index;
    final urlFor = _urlFor;
    if (index == null || urlFor == null) return;
    if (state.repeatMode == MusicRepeatMode.one) {
      await _player?.seek(Duration.zero);
      await _player?.play();
      return;
    }
    final target = nextQueueIndex(
      index: index,
      length: state.queue.length,
      repeat: state.repeatMode,
    );
    if (target == null) {
      await _player?.pause();
      state = state.copyWith(isPlaying: false);
      return;
    }
    await _playIndex(target);
  }

  Future<void> previous() async {
    final index = state.index;
    if (index == null) return;
    // Standard media behavior: restart the current track when past the intro.
    if (state.position > const Duration(seconds: 5)) {
      await _player?.seek(Duration.zero);
      return;
    }
    final target = previousQueueIndex(
      index: index,
      length: state.queue.length,
      repeat: state.repeatMode,
    );
    if (target == null) {
      await _player?.seek(Duration.zero);
      return;
    }
    await _playIndex(target);
  }

  /// Opens queue[index] without rebuilding the queue (keeps shuffle order and modes).
  Future<void> _playIndex(int index) async {
    final urlFor = _urlFor;
    final track = index >= 0 && index < state.queue.length ? state.queue[index] : null;
    if (urlFor == null || track == null) return;
    state = state.copyWith(index: index, position: Duration.zero, duration: Duration.zero);
    try {
      await _player?.open(Media(urlFor(track.id)));
      await _player?.play();
    } catch (error) {
      state = state.copyWith(error: 'audio playback failed: $error');
    }
  }

  /// Shuffle preserves the current track and restores library order when disabled.
  void toggleShuffle() {
    final current = state.current;
    if (state.shuffle) {
      final canonical = _canonicalQueue;
      if (canonical == null || current == null) {
        state = state.copyWith(shuffle: false);
        return;
      }
      final index = canonical.indexWhere((track) => track.id == current.id);
      state = state.copyWith(queue: canonical, index: index < 0 ? 0 : index, shuffle: false);
      _canonicalQueue = null;
      return;
    }
    if (state.queue.length < 2) {
      state = state.copyWith(shuffle: true);
      return;
    }
    _canonicalQueue = List<MusicTrack>.of(state.queue);
    final index = state.index ?? 0;
    state = state.copyWith(queue: buildShuffledOrder(state.queue, index), index: 0, shuffle: true);
  }

  MusicRepeatMode cycleRepeat() {
    final next = switch (state.repeatMode) {
      MusicRepeatMode.off => MusicRepeatMode.all,
      MusicRepeatMode.all => MusicRepeatMode.one,
      MusicRepeatMode.one => MusicRepeatMode.off,
    };
    state = state.copyWith(repeatMode: next);
    return next;
  }

  Future<void> playNext(MusicTrack track) async {
    await insertNext(track: track, urlFor: _urlFor ?? (id) => '/api/music/tracks/$id/stream');
  }

  Future<void> seekRelative(Duration offset) async {
    final player = _player;
    if (player == null) return;
    final target = state.position + offset;
    await player.seek(target < Duration.zero ? Duration.zero : target);
  }
}

final musicPlayerProvider =
    NotifierProvider<MusicPlayerService, MusicPlaybackState>(MusicPlayerService.new);
