// FR-3b: autoplay must also work when an episode is RESUMED from Continue
// Watching, not only when started from the series detail screen.
//
// Device-reported defect (2026-10-03): "When an episode finishes, it doesn't
// offer to (and by default choose to) automatically play the next episode."
// The series-detail path was verified on the device (Up Next card appears and
// advances), but the resume path pushed playback with an empty queue, so an
// episode resumed from Home reached the completed overlay and stopped.

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/core/theme/mediarr_theme.dart';
import 'package:mediarr_client/features/home/home_screen.dart';
import 'package:mediarr_client/features/library/continue_watching_section.dart';
import 'package:mediarr_client/features/playback/playback_screen.dart';
import 'package:mediarr_client/features/playback/playback_service.dart';
import 'package:mediarr_client/features/playback/subtitle_renderer.dart';
import 'package:mediarr_client/shared/models/episode.dart';
import 'package:mediarr_client/shared/models/season.dart';
import 'package:mediarr_client/shared/models/series.dart';
import 'package:mediarr_client/shared/services/api_client.dart';

import '../../support/fakes/fake_api_client.dart';
import '../../support/fakes/fake_media_player.dart';
import '../../support/focus_probe.dart';

/// Sends one key and pumps a bounded number of frames.
///
/// `pressDpad` uses `pumpAndSettle`, which never returns after a navigation
/// into `PlaybackScreen`: the fake player never reports `playing`, so the
/// buffering spinner animates forever.
Future<void> pressOnce(WidgetTester tester, LogicalKeyboardKey key) async {
  await tester.sendKeyEvent(key);
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 100));
}

Series _series() => Series(
      id: 7,
      title: 'How I Met Your Mother',
      seasons: [
        Season(
          id: 70,
          seasonNumber: 1,
          episodeCount: 3,
          episodeFileCount: 3,
          episodes: List.generate(
            3,
            (i) => Episode(
              id: 100 + i + 1,
              seasonNumber: 1,
              episodeNumber: i + 1,
              title: 'Episode ${i + 1}',
              hasFile: true,
            ),
          ),
        ),
      ],
    );

void main() {
  testWidgets(
      'resuming an episode from Continue Watching builds the play queue',
      (tester) async {
    tester.view.physicalSize = const Size(1280, 900);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final fake = FakeMediarrApiClient()..getSeriesDetailReturn = _series();
    final player = FakeMediaPlayer();
    final container = ProviderContainer(
      overrides: [
        apiClientProvider.overrideWith((ref) => fake),
        continueWatchingProvider.overrideWith(
          (ref) async => [
            ContinueWatchingItem(
              mediaId: 101,
              mediaType: 'episode',
              title: 'How I Met Your Mother',
              seriesId: 7,
              seasonNumber: 1,
              episodeNumber: 1,
              progress: 0.5,
              position: 1100,
              duration: 1320,
              lastWatched: DateTime(2026, 10, 3),
            ),
          ],
        ),
        recentlyAddedProvider.overrideWith((ref) async => const []),
        homeMoviesProvider.overrideWith((ref) async => const []),
        homeSeriesProvider.overrideWith((ref) async => const []),
        playbackServiceProvider.overrideWith((ref) => PlaybackService(
              ref.read(apiClientProvider.notifier),
              player: player,
              subtitleRenderer: FakeSubtitleRenderer(),
            )),
      ],
    );
    addTearDown(container.dispose);

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: MaterialApp(
          theme: mediarrDarkTheme,
          home: const HomeScreen(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    // Focus the Continue Watching card and resume it.
    await pressDpad(tester, LogicalKeyboardKey.arrowDown);
    expect(focusedText(), contains('How I Met Your Mother'));
    await pressOnce(tester, LogicalKeyboardKey.select);
    await tester.pump(const Duration(milliseconds: 300));

    // The resume path must have fetched the series detail to build the queue.
    expect(
      fake.getSeriesDetailCalls,
      contains(7),
      reason: 'Resuming an episode must fetch its series so the play queue '
          'can be built. Today the resume path passes no queue, so a finished '
          'episode never offers the next one.',
    );

    final screen = tester.widget<PlaybackScreen>(find.byType(PlaybackScreen));
    expect(
      screen.queue.map((item) => item.mediaId).toList(),
      [102, 103],
      reason: 'The resumed episode is S01E01; the queue must hold S01E02 and '
          'S01E03 so autoplay continues after it.',
    );
  });
}
