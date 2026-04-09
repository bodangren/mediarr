import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/core/theme/mediarr_theme.dart';
import 'package:mediarr_client/features/library/continue_watching_section.dart';
import 'package:mediarr_client/features/library/series_screen.dart';
import 'package:mediarr_client/shared/models/series.dart';
import 'package:mediarr_client/shared/services/api_client.dart';

void main() {
  group('SeriesScreen', () {
    testWidgets('shows loading state', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            continueWatchingProvider.overrideWith((ref) async => <ContinueWatchingItem>[]),
            seriesListProvider.overrideWith((ref) async {
              // Never resolves — stays in loading state
              await Completer<void>().future;
              return <Series>[];
            }),
          ],
          child: MaterialApp(
            theme: mediarrDarkTheme,
            home: const Scaffold(body: SeriesScreen()),
          ),
        ),
      );

      expect(find.text('Series'), findsOneWidget);
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('shows series list when data loaded', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            continueWatchingProvider.overrideWith((ref) async => <ContinueWatchingItem>[]),
            seriesListProvider.overrideWith((ref) async => [
                  const Series(
                    id: 1,
                    title: 'Breaking Bad',
                    year: 2008,
                    monitored: true,
                    seasonCount: 5,
                    episodeCount: 62,
                    episodeFileCount: 62,
                    status: 'ended',
                  ),
                  const Series(
                    id: 2,
                    title: 'Better Call Saul',
                    year: 2015,
                    monitored: true,
                  ),
                ]),
          ],
          child: MaterialApp(
            theme: mediarrDarkTheme,
            home: const Scaffold(body: SeriesScreen()),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Series'), findsOneWidget);
      expect(find.text('Breaking Bad'), findsWidgets);
      expect(find.text('Better Call Saul'), findsWidgets);
    });

    testWidgets('shows empty state when no series', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            continueWatchingProvider.overrideWith((ref) async => <ContinueWatchingItem>[]),
            seriesListProvider.overrideWith((ref) async => <Series>[]),
          ],
          child: MaterialApp(
            theme: mediarrDarkTheme,
            home: const Scaffold(body: SeriesScreen()),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('No series in library'), findsOneWidget);
    });
  });
}
