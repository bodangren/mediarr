import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/features/library/youtube_library_screen.dart';
import 'package:mediarr_client/shared/models/youtube_video.dart';

import '../../support/fakes/fake_api_client.dart';

void main() {
  testWidgets('All videos shows the queried library and sends search text', (tester) async {
    tester.view.physicalSize = const Size(1280, 720);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final api = FakeMediarrApiClient()
      ..youtubeVideosReturn = const [
        YoutubeVideo(id: 1, videoId: 'a', title: 'React Basics', streamUrl: '/s/1', thumbUrl: '', channel: 'CodeStoic'),
        YoutubeVideo(id: 2, videoId: 'b', title: 'Metal Mix', streamUrl: '/s/2', thumbUrl: '', channel: 'Music'),
      ];

    await tester.pumpWidget(MaterialApp(
      home: YoutubeLibraryScreen(api: api, onSelect: (_) {}),
    ));
    await tester.pump();
    await tester.pump();

    await tester.tap(find.text('All videos'));
    await tester.pump();
    await tester.pump();

    expect(find.text('React Basics'), findsWidgets);
    expect(find.text('Metal Mix'), findsWidgets);

    await tester.enterText(find.byType(TextField), 'react');
    await tester.pump(const Duration(milliseconds: 350));
    await tester.pump();
    expect(api.lastYoutubeQuery, 'react');
  });

  testWidgets('cards show watched and resume state', (tester) async {
    tester.view.physicalSize = const Size(1280, 720);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final api = FakeMediarrApiClient()
      ..youtubeVideosReturn = const [
        YoutubeVideo(
            id: 1, videoId: 'a', title: 'Done Video', streamUrl: '/s/1', thumbUrl: '',
            channel: 'C', isWatched: true),
        YoutubeVideo(
            id: 2, videoId: 'b', title: 'Partial Video', streamUrl: '/s/2', thumbUrl: '',
            channel: 'C', position: 90, durationSeconds: 600),
      ];

    await tester.pumpWidget(MaterialApp(
      home: YoutubeLibraryScreen(api: api, onSelect: (_) {}),
    ));
    await tester.pump();
    await tester.pump();

    expect(find.text('Watched'), findsOneWidget);
    expect(find.text('Resume · 1:30'), findsOneWidget);
  });
}
