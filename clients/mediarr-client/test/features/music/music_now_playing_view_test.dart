import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/features/music/music_library_screen.dart';
import 'package:mediarr_client/features/music/music_player_service.dart';
import 'package:mediarr_client/shared/models/music.dart';
import 'package:mediarr_client/shared/services/api_client.dart';

import '../../support/fakes/fake_api_client.dart';

/// Owner-visible gap 2026-11-21: the now-playing bar was the only player surface, so the
/// queue and the elapsed/total time were not reachable at 10 feet. Select on the bar's
/// title opens a full view with both.
void main() {
  testWidgets('the bar title opens a now-playing view with progress and up next', (tester) async {
    tester.view.physicalSize = const Size(1280, 720);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final api = FakeMediarrApiClient()
      ..musicArtistsReturn = const [MusicArtist(id: 1, name: 'AC/DC', albumCount: 1, trackCount: 2)]
      ..musicAlbumsReturn = const [MusicAlbum(id: 7, artistId: 1, title: 'Back in Black', trackCount: 2)]
      ..musicAlbumReturn = const MusicAlbumDetail(
        album: MusicAlbum(id: 7, artistId: 1, title: 'Back in Black', trackCount: 2),
        tracks: [
          MusicTrack(id: 11, title: 'Hells Bells', albumId: 7, artistId: 1, trackNumber: 1, durationSeconds: 312),
          MusicTrack(id: 12, title: 'Shoot to Thrill', albumId: 7, artistId: 1, trackNumber: 2, durationSeconds: 317),
        ],
      );

    await tester.pumpWidget(ProviderScope(
      overrides: [apiClientProvider.overrideWith((ref) => api)],
      child: const MaterialApp(home: MusicLibraryScreen()),
    ));
    await tester.pump();
    await tester.pump();

    // Start playback so the bar exists, then open the view from the bar's title.
    await tester.tap(find.text('AC/DC').first);
    await tester.pump();
    await tester.pump();

    expect(find.byType(LinearProgressIndicator), findsNothing);

    // The bar only exists while something is playing; drive it via the service.
    final container = ProviderScope.containerOf(tester.element(find.byType(MusicLibraryScreen)));
    await container.read(musicPlayerProvider.notifier).playQueue(
          tracks: const [
            MusicTrack(id: 11, title: 'Hells Bells', albumId: 7, artistId: 1, durationSeconds: 312),
            MusicTrack(id: 12, title: 'Shoot to Thrill', albumId: 7, artistId: 1, durationSeconds: 317),
          ],
          index: 0,
          urlFor: (trackId) => 'http://example.com/$trackId.mp3',
        );
    await tester.pump();
    await tester.pump();

    // The bar title is a FocusableAction; selecting it opens the dialog.
    await tester.tap(find.text('Hells Bells').first);
    await tester.pump();
    await tester.pump();

    expect(find.byType(LinearProgressIndicator), findsOneWidget);
    expect(find.text('Up next'), findsOneWidget);
  });
}
