import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/features/playback/playback_screen.dart';
import 'package:mediarr_client/features/playback/playback_service.dart';
import 'package:mediarr_client/features/playback/subtitle_renderer.dart';
import 'package:mediarr_client/shared/services/api_client.dart';

import '../../support/fakes/fake_api_client.dart';
import '../../support/fakes/fake_media_player.dart';

/// Regression cover for 2026-11-19 (v122, uncaught, route /playback):
///
///     Bad state: Cannot use "ref" after the widget was disposed.
///     _PlaybackScreenState._playCurrentItem  playback_screen.dart:472
///
/// The playback manifest is awaited during open; if the screen went away while
/// that request was in flight (interrupted open, force-stop, quick Back) the code
/// touched `ref` afterwards — both for the base URL and for the error reporter,
/// which turned an ordinary failed open into an uncaught exception.
void main() {
  testWidgets('a manifest failure after disposal does not touch ref', (tester) async {
    final apiClient = FakeMediarrApiClient();
    final player = FakeMediaPlayer();
    final gate = Completer<void>();
    apiClient.getPlaybackManifestGate = gate;
    apiClient.getPlaybackManifestError = StateError('server went away');

    final navigatorKey = GlobalKey<NavigatorState>();
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          apiClientProvider.overrideWith((ref) => apiClient),
          playbackServiceProvider.overrideWith((ref) => PlaybackService(
                ref.read(apiClientProvider.notifier),
                player: player,
                subtitleRenderer: FakeSubtitleRenderer(),
              )),
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
    expect(apiClient.getPlaybackManifestCalls, hasLength(1));

    // The screen goes away while the manifest request is still in flight.
    navigatorKey.currentState!.pop();
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));

    // Now the request fails, as it does when the server is restarting.
    gate.complete();
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));

    expect(
      tester.takeException(),
      isNull,
      reason: 'disposing during open must not surface an uncaught ref-after-dispose error',
    );
  });
}
