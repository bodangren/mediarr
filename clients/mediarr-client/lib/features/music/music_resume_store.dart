import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../../shared/models/music.dart';

/// Persisted "what was playing" snapshot for the Music library (track
/// feature_music_library_20261107, Phase 4: resume).
///
/// The queue is small (one album or the songs list), so it is stored whole: restoring then does not
/// depend on the album still being loaded, and no server round-trip is needed before playback.
class MusicResumeSnapshot {
  const MusicResumeSnapshot({
    required this.tracks,
    required this.index,
    required this.position,
    required this.savedAt,
  });

  final List<MusicTrack> tracks;
  final int index;
  final Duration position;
  final DateTime savedAt;

  MusicTrack? get current => index >= 0 && index < tracks.length ? tracks[index] : null;
}

Map<String, dynamic> encodeMusicResume(MusicResumeSnapshot snapshot) => {
      'version': 1,
      'index': snapshot.index,
      'positionSeconds': snapshot.position.inSeconds,
      'savedAt': snapshot.savedAt.toIso8601String(),
      'tracks': snapshot.tracks
          .map((track) => {
                'id': track.id,
                'title': track.title,
                'albumId': track.albumId,
                'artistId': track.artistId,
                'trackNumber': track.trackNumber,
                'discNumber': track.discNumber,
                'durationSeconds': track.durationSeconds,
                'isPlayed': track.isPlayed,
                'playCount': track.playCount,
              })
          .toList(),
    };

MusicResumeSnapshot? decodeMusicResume(Object? raw) {
  if (raw is! Map) return null;
  final version = raw['version'];
  if (version != 1) return null;
  final tracksRaw = raw['tracks'];
  if (tracksRaw is! List || tracksRaw.isEmpty) return null;
  final tracks = <MusicTrack>[];
  try {
    for (final item in tracksRaw) {
      if (item is! Map) return null;
      tracks.add(MusicTrack.fromJson(Map<String, dynamic>.from(item)));
    }
  } catch (_) {
    return null; // Corrupt state is discarded, never crashes startup.
  }
  final index = (raw['index'] as num?)?.toInt() ?? 0;
  if (index < 0 || index >= tracks.length) return null;
  final seconds = (raw['positionSeconds'] as num?)?.toInt() ?? 0;
  final savedAt = DateTime.tryParse(raw['savedAt'] as String? ?? '') ?? DateTime.now();
  return MusicResumeSnapshot(
    tracks: tracks,
    index: index,
    position: Duration(seconds: seconds < 0 ? 0 : seconds),
    savedAt: savedAt,
  );
}

String encodeMusicResumeJson(MusicResumeSnapshot snapshot) => jsonEncode(encodeMusicResume(snapshot));

MusicResumeSnapshot? decodeMusicResumeJson(String? text) {
  if (text == null || text.isEmpty) return null;
  try {
    return decodeMusicResume(jsonDecode(text));
  } catch (_) {
    return null;
  }
}

/// SharedPreferences-backed storage for the snapshot.
class MusicResumeStore {
  static const String storageKey = 'music.resume.v1';

  Future<MusicResumeSnapshot?> load() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return decodeMusicResumeJson(prefs.getString(storageKey));
    } catch (_) {
      return null;
    }
  }

  Future<void> save(MusicResumeSnapshot snapshot) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(storageKey, encodeMusicResumeJson(snapshot));
    } catch (_) {
      // Persistence is best effort; playback itself must never depend on it.
    }
  }
}
