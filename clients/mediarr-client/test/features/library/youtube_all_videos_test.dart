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

    // The All videos grid must show the same state: a fixed-width card in a
    // grid cell clipped the row off the bottom on the TV (2026-11-10).
    await tester.tap(find.text('All videos'));
    await tester.pump();
    await tester.pump();

    expect(find.text('Watched'), findsOneWidget);
    expect(find.text('Resume · 1:30'), findsOneWidget);
  });

  testWidgets('Play all starts the filtered list in the shown order',
      (tester) async {
    tester.view.physicalSize = const Size(1280, 720);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final api = FakeMediarrApiClient()
      ..youtubeVideosReturn = const [
        YoutubeVideo(id: 1, videoId: 'a', title: 'React Basics', streamUrl: '/s/1', thumbUrl: '', channel: 'CodeStoic'),
        YoutubeVideo(id: 2, videoId: 'b', title: 'Metal Mix', streamUrl: '/s/2', thumbUrl: '', channel: 'Music'),
        YoutubeVideo(id: 3, videoId: 'c', title: 'React Hooks', streamUrl: '/s/3', thumbUrl: '', channel: 'CodeStoic'),
      ];
    List<YoutubeVideo>? played;
    var singleTaps = 0;

    await tester.pumpWidget(MaterialApp(
      home: YoutubeLibraryScreen(
        api: api,
        onSelect: (_) => singleTaps++,
        onPlayAll: (videos) => played = videos,
      ),
    ));
    await tester.pump();
    await tester.pump();

    await tester.tap(find.text('All videos'));
    await tester.pump();
    await tester.pump();

    await tester.tap(find.text('Play all'));
    await tester.pump();

    expect(singleTaps, 0, reason: 'Play all must not play only the first card.');
    expect(played, isNotNull);
    expect(played!.map((video) => video.id).toList(), [1, 2, 3],
        reason: 'The queue must be the filtered list in the order it is shown.');
  });

  testWidgets('a channel header Play all plays that channel only',
      (tester) async {
    tester.view.physicalSize = const Size(1280, 720);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final api = FakeMediarrApiClient()
      ..youtubeVideosReturn = const [
        YoutubeVideo(id: 1, videoId: 'a', title: 'A1', streamUrl: '/s/1', thumbUrl: '', channel: 'Music'),
        YoutubeVideo(id: 2, videoId: 'b', title: 'B1', streamUrl: '/s/2', thumbUrl: '', channel: 'Music'),
        YoutubeVideo(id: 3, videoId: 'c', title: 'C1', streamUrl: '/s/3', thumbUrl: '', channel: 'Music'),
        YoutubeVideo(id: 4, videoId: 'd', title: 'D1', streamUrl: '/s/4', thumbUrl: '', channel: 'CodeStoic'),
      ];
    List<YoutubeVideo>? played;

    await tester.pumpWidget(MaterialApp(
      home: YoutubeLibraryScreen(
        api: api,
        onSelect: (_) {},
        onPlayAll: (videos) => played = videos,
      ),
    ));
    await tester.pump();
    await tester.pump();

    // Largest channel first; target its header, not the page-wide Play all.
    final header = find
        .ancestor(
          of: find.text('Music · 3 videos'),
          matching: find.byType(Row),
        )
        .first;
    await tester.tap(find.descendant(of: header, matching: find.text('Play all')));
    await tester.pump();

    expect(played!.map((video) => video.id).toList(), [1, 2, 3],
        reason: 'A channel Play all must send only that channel, in order.');
  });
}
