import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:media_kit/media_kit.dart';

import '../../shared/models/music.dart';

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
  });

  final List<MusicTrack> queue;
  final int? index;
  final bool isPlaying;
  final Duration position;
  final Duration duration;
  final String? error;

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
  }) {
    return MusicPlaybackState(
      queue: queue ?? this.queue,
      index: index ?? this.index,
      isPlaying: isPlaying ?? this.isPlaying,
      position: position ?? this.position,
      duration: duration ?? this.duration,
      error: clearError ? null : (error ?? this.error),
    );
  }
}

class MusicPlayerService extends Notifier<MusicPlaybackState> {
  Player? _player;
  String Function(int trackId)? _urlFor;
  final List<StreamSubscription<dynamic>> _subscriptions = [];

  @override
  MusicPlaybackState build() {
    ref.onDispose(() {
      for (final subscription in _subscriptions) {
        unawaited(subscription.cancel());
      }
      unawaited(_player?.dispose());
    });
    return const MusicPlaybackState();
  }

  Future<void> playQueue({
    required List<MusicTrack> tracks,
    required int index,
    required String Function(int trackId) urlFor,
  }) async {
    if (tracks.isEmpty || index < 0 || index >= tracks.length) return;
    _urlFor = urlFor;
    state = MusicPlaybackState(queue: tracks, index: index, isPlaying: false);
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
          if (value) unawaited(next());
        }));
      }
      await player.open(Media(urlFor(tracks[index].id)));
      await player.play();
    } catch (error) {
      state = state.copyWith(error: 'audio playback failed: $error');
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
    if (index == null || urlFor == null || index + 1 >= state.queue.length) return;
    await playQueue(tracks: state.queue, index: index + 1, urlFor: urlFor);
  }

  Future<void> previous() async {
    final index = state.index;
    final urlFor = _urlFor;
    if (index == null || urlFor == null || index == 0) return;
    await playQueue(tracks: state.queue, index: index - 1, urlFor: urlFor);
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
