import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/features/music/music_library_screen.dart';
import 'package:mediarr_client/shared/models/music.dart';
import 'package:mediarr_client/shared/services/api_client.dart';

import '../../support/fakes/fake_api_client.dart';

void main() {
  testWidgets('Songs has Play all/Shuffle all and a working search field', (tester) async {
    tester.view.physicalSize = const Size(1280, 720);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final api = FakeMediarrApiClient()
      ..musicArtistsReturn = const [MusicArtist(id: 1, name: 'AC/DC')]
      ..musicTracksReturn = const [
        MusicTrack(id: 11, title: 'Hells Bells', albumId: 7, artistId: 1, artistName: 'AC/DC', albumTitle: 'Back in Black'),
        MusicTrack(id: 12, title: 'Thunderstruck', albumId: 8, artistId: 1, artistName: 'AC/DC', albumTitle: 'The Razors Edge'),
      ];

    await tester.pumpWidget(
      ProviderScope(
        overrides: [apiClientProvider.overrideWith((ref) => api)],
        child: const MaterialApp(home: MusicLibraryScreen()),
      ),
    );
    await tester.pump();
    await tester.pump();

    // Sidebar -> Songs.
    await tester.sendKeyEvent(LogicalKeyboardKey.arrowLeft);
    await tester.pump();
    for (var i = 0; i < 3; i++) {
      await tester.sendKeyEvent(LogicalKeyboardKey.arrowDown);
      await tester.pump();
    }
    await tester.sendKeyEvent(LogicalKeyboardKey.select);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 350));

    expect(find.text('Play all'), findsOneWidget);
    expect(find.text('Shuffle all'), findsOneWidget);
    expect(find.text('Hells Bells'), findsWidgets);
    expect(find.text('AC/DC · Back in Black'), findsWidgets);

    await tester.enterText(find.byType(TextField), 'thunder');
    await tester.pump(const Duration(milliseconds: 350));
    await tester.pump();
    expect(api.lastMusicTracksQuery, 'thunder');
  });
}
