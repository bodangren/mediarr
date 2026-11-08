import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/features/music/music_library_screen.dart';
import 'package:mediarr_client/shared/models/music.dart';
import 'package:mediarr_client/shared/services/api_client.dart';

import '../../support/fakes/fake_api_client.dart';

/// Context menu on the TV Music screen (owner request 2026-11-08): the remote Menu key opens
/// actions for the focused item; Select runs one and closes the menu.
void main() {
  testWidgets('Menu key opens the album context menu and an action closes it', (tester) async {
    tester.view.physicalSize = const Size(1280, 720);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final api = FakeMediarrApiClient()
      ..musicArtistsReturn = const [MusicArtist(id: 1, name: 'AC/DC', albumCount: 1, trackCount: 1)]
      ..musicAlbumsReturn = const [MusicAlbum(id: 7, artistId: 1, title: 'Back in Black', trackCount: 1)]
      ..musicAlbumReturn = const MusicAlbumDetail(
        album: MusicAlbum(id: 7, artistId: 1, title: 'Back in Black', trackCount: 1),
        tracks: [MusicTrack(id: 11, title: 'Hells Bells', albumId: 7, artistId: 1, trackNumber: 1)],
      );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [apiClientProvider.overrideWith((ref) => api)],
        child: const MaterialApp(home: MusicLibraryScreen()),
      ),
    );
    await tester.pump();
    await tester.pump();

    // Artist grid focused; go to Albums from the in-screen sidebar and open the album grid.
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

    // Focus was handed to the first album card; Menu opens its context menu.
    await tester.sendKeyEvent(LogicalKeyboardKey.contextMenu);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));

    expect(find.text('Play album'), findsOneWidget);
    expect(find.text('Open album'), findsOneWidget);
    expect(find.text('Back closes this menu'), findsOneWidget);

    // Select the focused action: the dialog closes and the action runs.
    await tester.sendKeyEvent(LogicalKeyboardKey.select);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));

    expect(find.text('Play album'), findsNothing);
    expect(api.musicAlbumCalls, contains(7));
  });
}
