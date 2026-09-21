import 'dart:async';

import 'package:mediarr_client/features/playback/media_player.dart';

/// Test double for [MediaPlayer].
///
/// Mirrors the production stream surface closely enough for the playback
/// service to wire up its `_listenToPlayer` callbacks without ever touching
/// `media_kit`'s native backend. Tests drive the player by calling the
/// `emit*` helpers; assertions read the recorded `setAudioTrack` /
/// `setSubtitleTrack` / `seek` / etc. lists.
class FakeMediaPlayer implements MediaPlayer {
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

  final List<String> openCalls = [];
  final List<String> setAudioTrackCalls = [];
  final List<String?> setSubtitleTrackCalls = [];
  final List<Duration> seekCalls = [];
  final List<bool> playOrPauseCalls = [];
  final List<bool> stopCalls = [];
  bool disposed = false;
  bool throwOnOpen = false;

  @override
  Future<void> open(String streamUrl) async {
    openCalls.add(streamUrl);
    if (throwOnOpen) throw StateError('open failed');
  }

  @override
  Future<void> playOrPause() async {
    playOrPauseCalls.add(true);
  }

  @override
  Future<void> stop() async {
    stopCalls.add(true);
  }

  @override
  Future<void> seek(Duration position) async {
    seekCalls.add(position);
  }

  @override
  Future<void> setAudioTrack(String? trackId) async {
    setAudioTrackCalls.add(trackId ?? '<auto>');
  }

  @override
  Future<void> setSubtitleTrack(String? trackId) async {
    setSubtitleTrackCalls.add(trackId);
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

  // --- Test helpers ---

  /// Emit a track-list snapshot the service will react to with its
  /// default-selection logic.
  void emitTracks(MediaTrackLists lists) {
    _tracksController.add(lists);
  }

  void emitStatus(MediaPlayerStatus status) {
    _statusController.add(status);
  }

  void emitPosition(Duration position) {
    _positionController.add(position);
  }

  void emitDuration(Duration duration) {
    _durationController.add(duration);
  }

  void emitError(String error) {
    _errorController.add(error);
  }

  @override
  Future<void> dispose() async {
    disposed = true;
    await _tracksController.close();
    await _statusController.close();
    await _positionController.close();
    await _durationController.close();
    await _errorController.close();
  }
}
