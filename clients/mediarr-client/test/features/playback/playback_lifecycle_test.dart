import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/features/playback/playback_screen.dart';
import 'package:mediarr_client/features/playback/playback_service.dart';
import 'package:mediarr_client/features/playback/subtitle_renderer.dart';
import 'package:mediarr_client/shared/services/api_client.dart';

import '../../support/fakes/fake_api_client.dart';
import '../../support/fakes/fake_media_player.dart';

void main() {
  testWidgets('leaving the playback route stops the player', (tester) async {
    final navigatorKey = GlobalKey<NavigatorState>();
    final player = FakeMediaPlayer();
    final renderer = FakeSubtitleRenderer();

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          apiClientProvider.overrideWith((ref) => FakeMediarrApiClient()),
          playbackServiceProvider.overrideWith((ref) {
            return PlaybackService(
              ref.read(apiClientProvider.notifier),
              player: player,
              subtitleRenderer: renderer,
            );
          }),
        ],
        child: MaterialApp(
          navigatorKey: navigatorKey,
          home: Builder(
            builder: (context) => Scaffold(
              body: TextButton(
                onPressed: () => Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => const PlaybackScreen(
                      streamUrl: 'http://example.com/video.mp4',
                      title: 'Test video',
                      mediaId: 1,
                      mediaType: 'movie',
                    ),
                  ),
                ),
                child: const Text('Open playback'),
              ),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('Open playback'));
    await tester.pump();
    await tester.pump();
    expect(player.openCalls, hasLength(1));

    navigatorKey.currentState!.pop();
    await tester.pump(const Duration(milliseconds: 500));
    await tester.pump();
    await tester.runAsync(() async {
      await Future<void>.delayed(Duration.zero);
    });

    expect(player.stopCalls, isNotEmpty);
  });
}
