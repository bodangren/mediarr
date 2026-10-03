// FR-2b: the D-pad episode walk must keep the selection ON SCREEN.
//
// Device-reported defect (2026-10-03, X96Max box, release build): pressing
// Down through a season's episodes moves the selection below the fold while
// the SingleChildScrollView never scrolls, so "the selection is off the
// screen and I can't see what I'm selecting". The earlier walk tests passed
// because `focusIsInteractive` checks the cue exists, not that the focused
// row is inside the scroll viewport.

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/core/theme/mediarr_theme.dart';
import 'package:mediarr_client/core/widgets/leanback_scaffold.dart';
import 'package:mediarr_client/features/library/series_detail_screen.dart';
import 'package:mediarr_client/shared/models/episode.dart';
import 'package:mediarr_client/shared/models/season.dart';
import 'package:mediarr_client/shared/models/series.dart';
import 'package:mediarr_client/shared/services/api_client.dart';

import '../../support/fakes/fake_api_client.dart';
import '../../support/focus_probe.dart';

Series _series(int episodeCount) => Series(
      id: 1,
      title: 'How I Met Your Mother',
      year: 2005,
      monitored: true,
      seasons: [
        Season(
          id: 10,
          seasonNumber: 1,
          episodeCount: episodeCount,
          episodeFileCount: episodeCount,
          episodes: List.generate(
            episodeCount,
            (i) => Episode(
              id: 100 + i + 1,
              seasonNumber: 1,
              episodeNumber: i + 1,
              title: 'Episode ${i + 1}',
              airDateUtc: '2005-09-19T00:00:00Z',
              hasFile: true,
              monitored: true,
              quality: 'Bluray-1080p',
            ),
          ),
        ),
      ],
    );

Future<void> _pump(WidgetTester tester, Series series) async {
  tester.view.physicalSize = const Size(1920, 1080);
  tester.view.devicePixelRatio = 1.5;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);

  final fake = FakeMediarrApiClient()..getSeriesDetailReturn = series;
  final container = ProviderContainer(
    overrides: [apiClientProvider.overrideWith((ref) => fake)],
  );
  addTearDown(container.dispose);

  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: container,
      child: MaterialApp(
        theme: mediarrDarkTheme,
        home: LeanbackScaffold(
          currentPath: '/series',
          child: SeriesDetailScreen(series: series),
        ),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

/// Global rect of the [SingleChildScrollView] viewport.
Rect _viewportRect(WidgetTester tester) {
  final box = tester.renderObject<RenderBox>(find.byType(SingleChildScrollView));
  return box.localToGlobal(Offset.zero) & box.size;
}

/// Global rect of the currently focused control.
Rect? _focusedRect() {
  final context = primaryFocusNode()?.context;
  if (context == null) return null;
  final box = context.findRenderObject();
  if (box is! RenderBox || !box.attached || !box.hasSize) return null;
  return box.localToGlobal(Offset.zero) & box.size;
}

void main() {
  testWidgets(
      'walking Down keeps the focused episode row inside the scroll viewport',
      (tester) async {
    await _pump(tester, _series(12));

    final viewport = _viewportRect(tester);

    // Walk: Back -> chip -> episode 1 -> ... -> episode 8.
    await pressDpad(tester, LogicalKeyboardKey.arrowDown);
    expect(focusedText(), contains('S1'));
    await pressDpad(tester, LogicalKeyboardKey.arrowDown);
    expect(focusedText(), contains('Episode 1'));

    for (var i = 2; i <= 8; i++) {
      await pressDpad(tester, LogicalKeyboardKey.arrowDown);
      expect(focusedText(), contains('Episode $i'));

      final focused = _focusedRect();
      expect(
        focused,
        isNotNull,
        reason: 'After Down to episode $i nothing holds focus.',
      );
      final visible = focused!.overlaps(viewport) ||
          viewport.contains(focused.topLeft) ||
          viewport.contains(focused.bottomRight);
      expect(
        visible,
        isTrue,
        reason: 'After Down to episode $i the focused row is outside the '
            'scroll viewport ($focused vs $viewport). The view did not '
            'scroll with the selection: the owner cannot see what is '
            'selected. Device-reported 2026-10-03.',
      );
    }
  });
}
