import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/features/playback/media_player.dart';
import 'package:mediarr_client/features/playback/playback_screen.dart';
import 'package:mediarr_client/features/playback/playback_service.dart';
import 'package:mediarr_client/features/playback/subtitle_renderer.dart';
import 'package:mediarr_client/shared/services/api_client.dart';

import '../../support/fakes/fake_api_client.dart';
import '../../support/fakes/fake_media_player.dart';

/// Owner reports 2026-11-08:
/// - "the HUD never disappears on its own after a given time" (hide timer only fired once and was
///   skipped when the 5 s mark fell during buffering),
/// - "back immediately ends the video" (Back was not consumed).
void main() {
  late FakeMediarrApiClient apiClient;
  late FakeMediaPlayer player;
  late FakeSubtitleRenderer renderer;

  Future<void> pumpScreen(WidgetTester tester, {Widget? home}) async {
    tester.view.physicalSize = const Size(1280, 720);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
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
        child: MaterialApp(
          home: home ?? const PlaybackScreen(
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
  }

  setUp(() {
    apiClient = FakeMediarrApiClient();
    player = FakeMediaPlayer();
    renderer = FakeSubtitleRenderer();
  });

  testWidgets('the HUD hides after a buffering start, not only if it was already playing', (tester) async {
    await pumpScreen(tester);

    // The 5 s mark falls while the stream is still buffering.
    player.emitStatus(MediaPlayerStatus.buffering);
    await tester.pump(const Duration(seconds: 6));
    expect(find.text('Some Movie'), findsOneWidget, reason: 'controls stay during buffering');

    // Playback starts; the re-armed timer must now hide the HUD without any input.
    player.emitStatus(MediaPlayerStatus.playing);
    await tester.pump(const Duration(seconds: 6));
    expect(find.text('Some Movie'), findsNothing, reason: 'HUD auto-hides once playing');
  });

  testWidgets('Back hides the HUD instead of popping the route', (tester) async {
    await pumpScreen(tester);
    player.emitStatus(MediaPlayerStatus.playing);
    await tester.pump(const Duration(seconds: 1));

    // Show the HUD explicitly, then Back must only hide it.
    await tester.sendKeyEvent(LogicalKeyboardKey.arrowDown);
    await tester.pump();
    if (find.text('Some Movie').evaluate().isEmpty) {
      await tester.sendKeyEvent(LogicalKeyboardKey.arrowDown);
      await tester.pump();
    }
    expect(find.text('Some Movie'), findsOneWidget);

    await tester.sendKeyEvent(LogicalKeyboardKey.escape);
    await tester.pump();

    expect(find.text('Some Movie'), findsNothing, reason: 'Back closes the HUD');
    expect(find.byType(PlaybackScreen), findsOneWidget, reason: 'Back must not end playback');
  });

  testWidgets('system Back (route pop) toggles the HUD instead of ending playback', (tester) async {
    await pumpScreen(tester);
    player.emitStatus(MediaPlayerStatus.playing);
    await tester.pump(const Duration(seconds: 6));
    expect(find.text('Some Movie'), findsNothing);

    // Android delivers Back as a route pop, which PopScope intercepts.
    await tester.binding.handlePopRoute();
    await tester.pump();

    expect(find.text('Some Movie'), findsOneWidget, reason: 'Back reveals the HUD');
    expect(find.byType(PlaybackScreen), findsOneWidget, reason: 'Back must not end playback');
  });

  testWidgets('two system Backs show then hide the HUD without leaving playback', (tester) async {
    await pumpScreen(tester);
    player.emitStatus(MediaPlayerStatus.playing);
    await tester.pump(const Duration(seconds: 6));
    expect(find.text('Some Movie'), findsNothing);

    await tester.binding.handlePopRoute();
    await tester.pump();
    expect(find.text('Some Movie'), findsOneWidget);

    await tester.binding.handlePopRoute();
    await tester.pump();
    expect(find.text('Some Movie'), findsNothing, reason: 'second Back hides the HUD');
    expect(find.byType(PlaybackScreen), findsOneWidget);
  });

  testWidgets('Back with the HUD hidden shows it and does not exit', (tester) async {
    await pumpScreen(tester);
    player.emitStatus(MediaPlayerStatus.playing);
    await tester.pump(const Duration(seconds: 6));
    expect(find.text('Some Movie'), findsNothing);

    await tester.sendKeyEvent(LogicalKeyboardKey.escape);
    await tester.pump();
    expect(find.text('Some Movie'), findsOneWidget, reason: 'Back reveals the HUD');
    expect(find.byType(PlaybackScreen), findsOneWidget);
  });
}
