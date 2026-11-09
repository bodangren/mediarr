import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/core/theme/mediarr_theme.dart';
import 'package:mediarr_client/features/subtitles/wanted_screen.dart';
import 'package:mediarr_client/shared/models/subtitle_coverage.dart';

const _coverage = SubtitleCoverage(
  total: 4,
  withBoth: 2,
  buckets: [
    SubtitleCoverageBucket(bucket: 'continue-watching', total: 4, withBoth: 2, missingChinese: 1, missingBoth: 1),
    SubtitleCoverageBucket(bucket: 'backfill', total: 100, withBoth: 90, missingChinese: 10, missingBoth: 5),
  ],
);

void main() {
  test('parses the coverage payload and humanises bucket names', () {
    final parsed = SubtitleCoverage.fromJson({
      'buckets': [
        {'bucket': 'continue-watching', 'total': 13, 'withBoth': 8, 'missingChinese': 4, 'missingBoth': 2},
      ],
      'totals': {'total': 13, 'withBoth': 8},
    });
    expect(parsed.total, 13);
    expect(parsed.withBoth, 8);
    expect(parsed.buckets.single.label, 'Continue watching');
    expect(parsed.buckets.single.missingChinese, 4);
  });

  testWidgets('shows the coverage summary and per-bucket numbers', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [subtitleCoverageProvider.overrideWith((ref) async => _coverage)],
        child: MaterialApp(theme: mediarrDarkTheme, home: const WantedScreen()),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Subtitle coverage'), findsOneWidget);
    expect(find.text('2 of 4 items have EN+ZH'), findsOneWidget);
    expect(find.text('Continue watching'), findsOneWidget);
    expect(find.text('2/4 EN+ZH'), findsOneWidget);
    expect(find.text('Backfill'), findsOneWidget);
    expect(find.text('90/100 EN+ZH'), findsOneWidget);
    expect(find.textContaining('without Chinese'), findsWidgets);
  });
}
