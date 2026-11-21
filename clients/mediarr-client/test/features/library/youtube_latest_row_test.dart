import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/features/library/youtube_library_screen.dart';
import 'package:mediarr_client/shared/models/youtube_video.dart';

import '../../support/fakes/fake_api_client.dart';

/// Owner request 2026-11-20: the YouTube library should read like a video podcast
/// player — the newest episodes first, with today/age visible on the card.
void main() {
  testWidgets('Latest row leads the page with age labels and the new count', (tester) async {
    tester.view.physicalSize = const Size(1280, 720);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final api = FakeMediarrApiClient()
      ..youtubeVideosReturn = const [
        YoutubeVideo(id: 1, videoId: 'a', title: 'Older Episode', streamUrl: '/s/1', thumbUrl: '', channel: 'Pod'),
      ]
      ..youtubeLatestReturn = const YoutubeLatestPage(
        newCount: 1,
        items: [
          YoutubeVideo(
            id: 2,
            videoId: 'b',
            title: 'Episode from this morning',
            streamUrl: '/s/2',
            thumbUrl: '',
            channel: 'Pod',
            ageLabel: 'today',
            isNew: true,
            durationSeconds: 3600,
          ),
        ],
      );

    await tester.pumpWidget(MaterialApp(
      home: YoutubeLibraryScreen(api: api, onSelect: (_) {}),
    ));
    await tester.pump();
    await tester.pump();

    expect(find.text('Latest'), findsOneWidget);
    expect(find.text('1 new'), findsOneWidget);
    expect(find.text('Episode from this morning'), findsWidgets);
    expect(find.text('NEW · today'), findsOneWidget);
    // The channel library below still renders.
    expect(find.textContaining('Pod ·'), findsWidgets);
  });

  testWidgets('the Latest row stays hidden until dates exist', (tester) async {
    tester.view.physicalSize = const Size(1280, 720);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final api = FakeMediarrApiClient()
      ..youtubeVideosReturn = const [
        YoutubeVideo(id: 1, videoId: 'a', title: 'Undated Video', streamUrl: '/s/1', thumbUrl: '', channel: 'Pod'),
      ]
      ..youtubeLatestReturn = const YoutubeLatestPage(
        newCount: 0,
        items: [
          YoutubeVideo(
            id: 2,
            videoId: 'b',
            title: 'Archive Video',
            streamUrl: '/s/2',
            thumbUrl: '',
            channel: 'Pod',
            ageLabel: 'archive',
          ),
        ],
      );

    await tester.pumpWidget(MaterialApp(
      home: YoutubeLibraryScreen(api: api, onSelect: (_) {}),
    ));
    await tester.pump();
    await tester.pump();

    expect(find.text('Latest'), findsNothing);
    expect(find.text('Undated Video'), findsWidgets);
  });
}
