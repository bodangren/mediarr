import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/features/music/music_library_screen.dart';
import 'package:mediarr_client/shared/models/music.dart';
import 'package:mediarr_client/shared/services/api_client.dart';

import '../../support/fakes/fake_api_client.dart';

/// D-pad focus walk for the Music shell (feature_music_library_20261107, Phase 4):
/// sidebar <-> artist grid <-> album grid <-> track list <-> now-playing bar.
void main() {
  testWidgets('walk: artists -> sidebar Albums -> album -> track -> now playing', (tester) async {
    tester.view.physicalSize = const Size(1280, 720);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final api = FakeMediarrApiClient()
      ..musicArtistsReturn = const [
        MusicArtist(id: 1, name: 'AC/DC', albumCount: 1, trackCount: 1),
      ]
      ..musicAlbumsReturn = const [
        MusicAlbum(id: 7, artistId: 1, title: 'Back in Black', trackCount: 2),
      ]
      ..musicAlbumReturn = const MusicAlbumDetail(
        album: MusicAlbum(id: 7, artistId: 1, title: 'Back in Black', trackCount: 2),
        tracks: [
          MusicTrack(id: 11, title: 'Hells Bells', albumId: 7, artistId: 1, trackNumber: 1, durationSeconds: 312),
          MusicTrack(id: 12, title: 'Shoot to Thrill', albumId: 7, artistId: 1, trackNumber: 2, durationSeconds: 317),
        ],
      );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [apiClientProvider.overrideWith((ref) => api)],
        child: const MaterialApp(home: MusicLibraryScreen()),
      ),
    );
    await tester.pump();
    await tester.pump();

    expect(find.text('AC/DC'), findsOneWidget);

    await tester.sendKeyEvent(LogicalKeyboardKey.arrowLeft);
    await tester.pump();
    await tester.sendKeyEvent(LogicalKeyboardKey.arrowDown);
    await tester.pump();
    await tester.sendKeyEvent(LogicalKeyboardKey.arrowRight);
    await tester.pump();
    await tester.sendKeyEvent(LogicalKeyboardKey.select);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));

    expect(find.text('Back in Black'), findsOneWidget);

    await tester.sendKeyEvent(LogicalKeyboardKey.select);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.text('Hells Bells'), findsOneWidget);

    await tester.sendKeyEvent(LogicalKeyboardKey.arrowDown);
    await tester.pump();
    await tester.sendKeyEvent(LogicalKeyboardKey.select);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));

    expect(find.text('Hells Bells'), findsWidgets);
  });
}
