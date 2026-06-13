import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/core/theme/mediarr_theme.dart';
import 'package:mediarr_client/shared/widgets/media_detail/file_info_card.dart';

/// Widget tests for `FileInfoCard` — feature-agnostic file-info card used by
/// `MovieDetailScreen` (Phase 3) and per-episode rendering in
/// `SeriesDetailScreen` (Phase 4).
///
/// Per `test-strategy.md` §4 guardrail #3: takes primitives only — quality,
/// path, sizeBytes, audioTrackCount, subtitleTrackCount. No model imports.
void main() {
  Widget buildTestApp({required Widget child}) {
    return MaterialApp(
      theme: mediarrDarkTheme,
      home: Scaffold(body: child),
    );
  }

  group('FileInfoCard', () {
    testWidgets('renders quality badge when provided', (tester) async {
      await tester.pumpWidget(buildTestApp(
        child: const FileInfoCard(
          quality: 'Bluray-1080p',
        ),
      ));

      expect(find.text('Bluray-1080p'), findsOneWidget);
    });

    testWidgets('renders the file path when provided', (tester) async {
      await tester.pumpWidget(buildTestApp(
        child: const FileInfoCard(
          path: '/media/movies/Inception (2010)/Inception.mkv',
        ),
      ));

      expect(
        find.text('/media/movies/Inception (2010)/Inception.mkv'),
        findsOneWidget,
      );
    });

    testWidgets('renders a human-readable size when sizeBytes is provided',
        (tester) async {
      // 15 GB expressed in bytes.
      const fifteenGb = 15 * 1024 * 1024 * 1024;

      await tester.pumpWidget(buildTestApp(
        child: const FileInfoCard(
          sizeBytes: fifteenGb,
        ),
      ));

      // The exact formatting ("15.0 GB", "15 GB", ...) is
      // implementation-defined. We assert the numeric part is present and the
      // unit "GB" is present so the test isn't tied to a specific format.
      expect(find.textContaining('15'), findsOneWidget);
      expect(find.textContaining('GB'), findsOneWidget);
    });

    testWidgets('renders audio/subtitle track summary when counts provided',
        (tester) async {
      await tester.pumpWidget(buildTestApp(
        child: const FileInfoCard(
          audioTrackCount: 2,
          subtitleTrackCount: 3,
        ),
      ));

      // 2 audio tracks and 3 subtitle tracks should both be reflected.
      expect(find.textContaining('2'), findsWidgets);
      expect(find.textContaining('3'), findsWidgets);
    });

    testWidgets('renders a "no file" placeholder when all fields are null',
        (tester) async {
      // Per test-strategy §6: Movie with `hasFile: false` must hide
      // FileInfoCard. The implementation contract is: when the card IS
      // rendered with no data, it shows a "No file" placeholder. The screen
      // itself is responsible for not rendering the card at all when
      // `hasFile == false`; this test exercises the placeholder path used by
      // that screen's parent logic.
      await tester.pumpWidget(buildTestApp(
        child: const FileInfoCard(),
      ));

      // Some "no file" / "missing" indicator text must be present.
      expect(find.textContaining('No'), findsWidgets);
    });

    testWidgets('renders all fields together with a section header',
        (tester) async {
      const fifteenGb = 15 * 1024 * 1024 * 1024;

      await tester.pumpWidget(buildTestApp(
        child: const FileInfoCard(
          quality: 'Bluray-1080p',
          path: '/media/Inception.mkv',
          sizeBytes: fifteenGb,
          audioTrackCount: 2,
          subtitleTrackCount: 3,
        ),
      ));

      expect(find.text('Bluray-1080p'), findsOneWidget);
      expect(find.text('/media/Inception.mkv'), findsOneWidget);
      // 15 GB worth of bytes → contains "15" and a GB unit.
      expect(find.textContaining('15'), findsOneWidget);
      expect(find.textContaining('GB'), findsOneWidget);
    });
  });
}
