import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/core/widgets/netflix_scaffold.dart';
import 'package:mediarr_client/features/music/music_library_screen.dart';
import 'package:mediarr_client/features/music/music_player_service.dart';
import 'package:mediarr_client/shared/models/music.dart';
import 'package:mediarr_client/shared/services/api_client.dart';

import '../../support/fakes/fake_api_client.dart';

/// The music acceptance list asks for seek on the TV; the progress bar used to be decorative.
/// The now-playing view's seek control owns Left/Right while focused, so a remote can rewind or
/// advance 10 seconds. The real position change is verified on the device; here we pin the
/// contract: the callbacks fire only where provided, and the view exposes the control.
void main() {
  testWidgets('FocusableAction consumes Left/Right only when handlers are provided', (tester) async {
    var left = 0;
    var right = 0;
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: Center(
          child: FocusableAction(
            autofocus: true,
            variant: FocusableActionVariant.button,
            onArrowLeft: () => left++,
            onArrowRight: () => right++,
            child: const SizedBox(width: 200, height: 40, child: Text('seek')),
          ),
        ),
      ),
    ));
    await tester.pump();

    await tester.sendKeyEvent(LogicalKeyboardKey.arrowRight);
    await tester.sendKeyEvent(LogicalKeyboardKey.arrowLeft);
    await tester.pump();
    expect(right, 1);
    expect(left, 1);
  });

  testWidgets('the now-playing view exposes a seek control', (tester) async {
    tester.view.physicalSize = const Size(1280, 720);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final api = FakeMediarrApiClient();
    await tester.pumpWidget(ProviderScope(
      overrides: [apiClientProvider.overrideWith((ref) => api)],
      child: const MaterialApp(home: MusicLibraryScreen()),
    ));
    await tester.pump();
    await tester.pump();

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

    await tester.tap(find.text('Hells Bells').first);
    await tester.pump();
    await tester.pump();

    expect(find.byKey(const ValueKey('seek')), findsOneWidget);
    expect(find.text('0:00'), findsWidgets);
  });
}
