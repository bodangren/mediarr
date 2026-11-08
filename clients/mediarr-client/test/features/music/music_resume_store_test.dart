import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/features/music/music_resume_store.dart';
import 'package:mediarr_client/shared/models/music.dart';

void main() {
  const tracks = [
    MusicTrack(id: 11, title: 'Hells Bells', albumId: 7, artistId: 1, trackNumber: 1, durationSeconds: 312),
    MusicTrack(id: 12, title: 'Shoot to Thrill', albumId: 7, artistId: 1, trackNumber: 2, durationSeconds: 317),
  ];

  test('round-trips a queue snapshot', () {
    final snapshot = MusicResumeSnapshot(
      tracks: tracks,
      index: 1,
      position: const Duration(seconds: 95),
      savedAt: DateTime.parse('2026-11-08T12:00:00Z'),
    );

    final decoded = decodeMusicResumeJson(encodeMusicResumeJson(snapshot));

    expect(decoded, isNotNull);
    expect(decoded!.index, 1);
    expect(decoded.position, const Duration(seconds: 95));
    expect(decoded.current?.title, 'Shoot to Thrill');
    expect(decoded.tracks, hasLength(2));
  });

  test('discards corrupt, empty or out-of-range snapshots', () {
    expect(decodeMusicResumeJson('not json'), isNull);
    expect(decodeMusicResumeJson('{}'), isNull);
    expect(decodeMusicResume({}), isNull);
    expect(decodeMusicResume({
      'version': 1,
      'index': 5,
      'positionSeconds': 10,
      'tracks': [
        {'id': 1, 'title': 'x', 'albumId': 1, 'artistId': 1},
      ],
    }), isNull);
  });
}
