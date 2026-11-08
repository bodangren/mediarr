import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/features/playback/playback_screen.dart';
import 'package:mediarr_client/features/playback/playback_service.dart';
import 'package:mediarr_client/features/playback/subtitle_renderer.dart';
import 'package:mediarr_client/shared/services/api_client.dart';

import '../../support/fakes/fake_api_client.dart';
import '../../support/fakes/fake_media_player.dart';

/// Owner defect 2026-11-08: resuming The Avengers started at the beginning. The Continue Watching
/// caller knows the stored position, so playback must start there even when the manifest request
/// fails or returns no resume.
void main() {
  testWidgets('caller-provided resumeFrom starts the player at that offset', (tester) async {
    final apiClient = FakeMediarrApiClient();
    final player = FakeMediaPlayer();
    final renderer = FakeSubtitleRenderer();

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          apiClientProvider.overrideWith((ref) => apiClient),
          playbackServiceProvider.overrideWith((ref) => PlaybackService(
                ref.read(apiClientProvider.notifier),
                player: player,
                subtitleRenderer: renderer,
              )),
        ],
        child: const MaterialApp(
          home: PlaybackScreen(
            streamUrl: 'http://example.com/movie.mp4',
            title: 'The Avengers',
            mediaId: 382,
            mediaType: 'movie',
            resumeFrom: Duration(seconds: 2315),
          ),
        ),
      ),
    );
    await tester.pump();
    await tester.pump();

    expect(player.openStartCalls, [const Duration(seconds: 2315)]);
    // Let the overlay auto-hide timer fire so the widget test can dispose without a pending timer.
    await tester.pump(const Duration(seconds: 6));
  });
}
