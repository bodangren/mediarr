import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/features/library/youtube_library_screen.dart';
import 'package:mediarr_client/shared/models/youtube_video.dart';

import '../../support/fakes/fake_api_client.dart';

List<YoutubeVideo> channelVideos(String channel, int count) => [
      for (var i = 0; i < count; i++)
        YoutubeVideo(
          id: i + 1,
          videoId: 'vid${i.toString().padLeft(8, '0')}',
          title: '$channel video $i',
          streamUrl: 'http://example.com/$i.mp4',
          thumbUrl: '',
          channel: channel,
          durationSeconds: 600,
          isWatched: false,
        ),
    ];

void main() {
  testWidgets('a large channel can be opened as a vertical list via See all', (tester) async {
    final api = FakeMediarrApiClient()..youtubeVideosReturn = channelVideos('Channel A', 40);
    await tester.pumpWidget(MaterialApp(
      home: YoutubeLibraryScreen(api: api, onSelect: (_) {}),
    ));
    await tester.pumpAndSettle();

    expect(find.text('Channel A · 40 videos'), findsOneWidget);
    expect(find.text('See all'), findsOneWidget);

    await tester.tap(find.text('See all'));
    await tester.pumpAndSettle();

    // The channel screen lists every video vertically and offers Back.
    expect(find.text('Channel A · 40 videos'), findsWidgets);
    expect(find.text('Back'), findsOneWidget);
    expect(find.text('Channel A video 0'), findsOneWidget);
  });
}
