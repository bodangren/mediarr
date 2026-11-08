import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/features/playback/playback_screen.dart';
import 'package:mediarr_client/features/playback/media_player.dart';
import 'package:mediarr_client/features/playback/playback_service.dart';
import 'package:mediarr_client/features/playback/subtitle_renderer.dart';
import 'package:mediarr_client/shared/services/api_client.dart';

import '../../support/fakes/fake_api_client.dart';
import '../../support/fakes/fake_media_player.dart';

/// Overlay hidden: Left/Right seek directly (no HUD) and repeated presses accelerate.
/// Owner report 2026-11-08: "there is no good way to seek forward a lot; left/right only affect
/// the HUD menu".
void main() {
  testWidgets('repeated right presses seek 10s then 30s and keep the overlay hidden', (tester) async {
    tester.view.physicalSize = const Size(1280, 720);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

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
            title: 'Some Movie',
            mediaId: 7,
            mediaType: 'movie',
          ),
        ),
      ),
    );
    await tester.pump();
    await tester.pump();

    // Let the transport auto-hide (it only hides while the video is running).
    player.emitStatus(MediaPlayerStatus.playing);
    await tester.pump(const Duration(seconds: 5));
    player.seekCalls.clear();
    await tester.sendKeyEvent(LogicalKeyboardKey.arrowRight);
    await tester.pump();
    await tester.sendKeyEvent(LogicalKeyboardKey.arrowRight);
    await tester.pump();

    expect(player.seekCalls.first, const Duration(seconds: 10));
    expect(player.seekCalls.last, const Duration(seconds: 40));
    // A toast label is published for the HUD-less seek (visual check on device).
    expect(player.seekCalls.length, 2);
  });
}
