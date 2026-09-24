import 'dart:async';

import 'package:media_kit/media_kit.dart';

import 'track_selection.dart';

/// Snapshot of the currently-available audio + subtitle tracks.
///
/// Mirrors the parts of `media_kit`'s `Tracks` model that the playback
/// service actually consumes. We intentionally do NOT expose video tracks —
/// the player picks the only video track automatically.
class MediaTrackLists {
  const MediaTrackLists({
    this.audio = const [],
    this.subtitle = const [],
  });

  final List<AudioTrackInfo> audio;
  final List<SubtitleTrackInfo> subtitle;

  bool get isEmpty => audio.isEmpty && subtitle.isEmpty;

  @override
  bool operator ==(Object other) =>
      other is MediaTrackLists &&
      _listEq(other.audio, audio) &&
      _listEq(other.subtitle, subtitle);

  @override
  int get hashCode => Object.hash(Object.hashAll(audio), Object.hashAll(subtitle));

  static bool _listEq(List<Object> a, List<Object> b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }
}

/// Status transitions reported by the underlying player.
enum MediaPlayerStatus { idle, opening, buffering, playing, paused, completed }

/// Minimal player-side interface used by `PlaybackService`.
///
/// We avoid passing `media_kit`'s concrete `Player` to the service because:
///   1. `Player`'s constructor tries to load libmpv (NativePlayer) or
///      `dart.library.js_interop` (WebPlayer) eagerly. Tests cannot construct
///      it.
///   2. The service only consumes a small subset of the player surface; the
///      rest is irrelevant to the playback flow.
abstract class MediaPlayer {
  /// Open [streamUrl] and start loading the media.
  Future<void> open(String streamUrl);

  /// Toggle play / pause.
  Future<void> playOrPause();

  /// Stop playback.
  Future<void> stop();

  /// Seek to [position].
  Future<void> seek(Duration position);

  /// Select the audio track with the given [trackId] from the current audio
  /// list, or `null` to use the player's default selection.
  Future<void> setAudioTrack(String? trackId);

  /// Select the subtitle track with the given [trackId], or `null` to disable
  /// subtitles.
  Future<void> setSubtitleTrack(String? trackId);

  /// Stream of track lists emitted when the player discovers tracks.
  Stream<MediaTrackLists> get tracks;

  /// Stream of playback status transitions.
  Stream<MediaPlayerStatus> get status;

  /// Stream of current playback position.
  Stream<Duration> get position;

  /// Stream of total media duration.
  Stream<Duration> get duration;

  /// Stream of error messages.
  Stream<String> get errors;

  /// Release all native resources.
  Future<void> dispose();
}

/// Production implementation that wraps `media_kit`'s `Player`.
class MediaKitMediaPlayer implements MediaPlayer {
  MediaKitMediaPlayer({Player? player}) : _player = player ?? Player() {
    _attachListeners();
  }

  /// The underlying `media_kit` `Player`. Exposed so the production subtitle
  /// renderer (which talks libmpv's `sub-delay` property directly) can share
  /// the same instance instead of creating a second one.
  Player get player => _player;

  final Player _player;
  final StreamController<MediaTrackLists> _tracksController =
      StreamController<MediaTrackLists>.broadcast();
  final StreamController<MediaPlayerStatus> _statusController =
      StreamController<MediaPlayerStatus>.broadcast();
  final StreamController<Duration> _positionController =
      StreamController<Duration>.broadcast();
  final StreamController<Duration> _durationController =
      StreamController<Duration>.broadcast();
  final StreamController<String> _errorController =
      StreamController<String>.broadcast();

  void _attachListeners() {
    _player.stream.playing.listen((playing) {
      _statusController.add(
        playing ? MediaPlayerStatus.playing : MediaPlayerStatus.paused,
      );
    });
    _player.stream.buffering.listen((buffering) {
      // FR-7: `buffering: false` must not be dropped. The old code reported
      // `buffering` only, so one blip left the status stuck there and blocked
      // the transport overlay auto-hide forever.
      if (buffering) {
        _statusController.add(MediaPlayerStatus.buffering);
      } else {
        _statusController.add(
          _player.state.playing
              ? MediaPlayerStatus.playing
              : MediaPlayerStatus.paused,
        );
      }
    });
    _player.stream.completed.listen((completed) {
      if (completed) _statusController.add(MediaPlayerStatus.completed);
    });
    _player.stream.error.listen((e) {
      _errorController.add(e);
    });
    _player.stream.position.listen(_positionController.add);
    _player.stream.duration.listen(_durationController.add);
    _player.stream.tracks.listen((tracks) {
      _tracksController.add(MediaTrackLists(
        audio: tracks.audio
            .map((t) => AudioTrackInfo(
                  id: t.id,
                  language: t.language,
                  title: t.title,
                ))
            .toList(),
        subtitle: tracks.subtitle
            .map((t) => SubtitleTrackInfo(
                  id: t.id,
                  language: t.language,
                  title: t.title,
                ))
            .toList(),
      ));
    });
  }

  @override
  Future<void> open(String streamUrl) async {
    await _player.open(Media(streamUrl));
    if (!_statusController.isClosed) {
      _statusController.add(MediaPlayerStatus.opening);
    }
  }

  @override
  Future<void> playOrPause() async {
    await _player.playOrPause();
  }

  @override
  Future<void> stop() async {
    await _player.stop();
  }

  @override
  Future<void> seek(Duration position) async {
    await _player.seek(position);
  }

  @override
  Future<void> setAudioTrack(String? trackId) async {
    if (trackId == null) {
      await _player.setAudioTrack(AudioTrack.auto());
      return;
    }
    final match = _player.state.tracks.audio.firstWhere(
      (t) => t.id == trackId,
      orElse: () => AudioTrack.auto(),
    );
    await _player.setAudioTrack(match);
  }

  @override
  Future<void> setSubtitleTrack(String? trackId) async {
    if (trackId == null) {
      await _player.setSubtitleTrack(SubtitleTrack.no());
      return;
    }
    final match = _player.state.tracks.subtitle.firstWhere(
      (t) => t.id == trackId,
      orElse: () => SubtitleTrack.no(),
    );
    await _player.setSubtitleTrack(match);
  }

  @override
  Stream<MediaTrackLists> get tracks => _tracksController.stream;

  @override
  Stream<MediaPlayerStatus> get status => _statusController.stream;

  @override
  Stream<Duration> get position => _positionController.stream;

  @override
  Stream<Duration> get duration => _durationController.stream;

  @override
  Stream<String> get errors => _errorController.stream;

  @override
  Future<void> dispose() async {
    await _tracksController.close();
    await _statusController.close();
    await _positionController.close();
    await _durationController.close();
    await _errorController.close();
    await _player.dispose();
  }
}
