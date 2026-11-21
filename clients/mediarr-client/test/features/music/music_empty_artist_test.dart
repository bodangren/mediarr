import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/features/music/music_library_screen.dart';
import 'package:mediarr_client/shared/models/music.dart';
import 'package:mediarr_client/shared/services/api_client.dart';

import '../../support/fakes/fake_api_client.dart';

/// Owner-visible defect measured on the TV 2026-11-21: the artists grid rendered
/// "Unknown Artist · 0 songs" — a row that looks broken and does nothing.
void main() {
  testWidgets('artists with no tracks are not rendered', (tester) async {
    tester.view.physicalSize = const Size(1280, 720);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final api = FakeMediarrApiClient()
      ..musicArtistsReturn = const [
        MusicArtist(id: 1, name: 'AC/DC', albumCount: 1, trackCount: 5),
        MusicArtist(id: 2, name: 'Unknown Artist', albumCount: 1, trackCount: 0),
      ];

    await tester.pumpWidget(
      ProviderScope(
        overrides: [apiClientProvider.overrideWith((ref) => api)],
        child: const MaterialApp(home: MusicLibraryScreen()),
      ),
    );
    await tester.pump();
    await tester.pump();

    expect(find.text('AC/DC'), findsWidgets);
    expect(find.text('Unknown Artist'), findsNothing);
    expect(find.text('0 songs'), findsNothing);
  });
}
