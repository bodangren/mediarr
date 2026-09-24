import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/core/theme/mediarr_theme.dart';
import 'package:mediarr_client/features/home/home_screen.dart';
import 'package:mediarr_client/features/library/continue_watching_section.dart';
import 'package:mediarr_client/features/library/see_all_screen.dart';
import 'package:mediarr_client/shared/models/library_item.dart';
import 'package:mediarr_client/shared/models/movie.dart';
import 'package:mediarr_client/shared/services/api_client.dart';

/// Owner mockup (2026-09-24) contract for the home screen.
///
/// FR-2 hero: `FEATURED` eyebrow, state-aware `Resume`/`Play`, `Details`
/// action, metadata line, and quality chips that hide when the API provides
/// no quality field. FR-4: every library row carries `See All >`, which opens
/// the grid screen.
void main() {
  ProviderContainer createContainer({List<Override> overrides = const []}) {
    return ProviderContainer(
      overrides: [
        continueWatchingProvider.overrideWith((ref) async => const []),
        upcomingProvider.overrideWith((ref) async => const []),
        recentlyAddedProvider.overrideWith((ref) async => const [
              LibraryItem(
                id: 22,
                title: 'The Matrix',
                type: 'movie',
                year: 1999,
              ),
            ]),
        homeMoviesProvider.overrideWith((ref) async => const []),
        homeSeriesProvider.overrideWith((ref) async => const []),
        seeAllItemsProvider.overrideWith((ref) async => const []),
        ...overrides,
      ],
    );
  }

  void setLargeViewport(WidgetTester tester) {
    tester.view.physicalSize = const Size(1280, 900);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
  }

  Future<void> pumpHome(WidgetTester tester, ProviderContainer container) async {
    setLargeViewport(tester);
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
  }

  testWidgets('hero shows FEATURED eyebrow, Play when nothing is in progress, '
      'and a runtime on the metadata line', (tester) async {
    final container = createContainer(overrides: [
      heroMovieProvider.overrideWith((ref, id) async => const Movie(
            id: 22,
            title: 'The Matrix',
            year: 1999,
            runtime: 136,
            quality: '1080p',
          )),
    ]);
    addTearDown(container.dispose);

    await pumpHome(tester, container);

    expect(find.text('FEATURED'), findsOneWidget);
    expect(find.text('Play'), findsOneWidget,
        reason: 'No playback progress exists, so the primary action is Play.');
    expect(find.text('Details'), findsOneWidget);
    expect(find.textContaining('1999'), findsWidgets);
    expect(find.textContaining('2h 16m'), findsOneWidget,
        reason: 'FR-2 metadata line carries the runtime (136 min).');
    expect(find.text('HD'), findsOneWidget,
        reason: 'FR-2 chip derived from quality 1080p.');
  });

  testWidgets('hero shows Resume when a continue-watching entry exists',
      (tester) async {
    final container = createContainer(overrides: [
      continueWatchingProvider.overrideWith((ref) async => [
            ContinueWatchingItem(
              mediaType: 'movie',
              mediaId: 22,
              title: 'The Matrix',
              progress: 0.5,
              position: 1800,
              duration: 3600,
              lastWatched: DateTime(2026, 9, 24),
            ),
          ]),
      heroMovieProvider.overrideWith((ref, id) async => const Movie(
            id: 22,
            title: 'The Matrix',
            year: 1999,
            runtime: 136,
            quality: '2160p',
          )),
    ]);
    addTearDown(container.dispose);

    await pumpHome(tester, container);

    expect(find.text('Resume'), findsOneWidget,
        reason: 'FR-2: in-progress titles offer Resume.');
    expect(find.text('Play'), findsNothing);
    expect(find.text('4K'), findsOneWidget,
        reason: 'FR-2 chip derived from quality 2160p.');
  });

  testWidgets('hero hides quality chips when the API provides no quality',
      (tester) async {
    final container = createContainer(overrides: [
      heroMovieProvider.overrideWith((ref, id) async =>
          const Movie(id: 22, title: 'The Matrix', year: 1999)),
    ]);
    addTearDown(container.dispose);

    await pumpHome(tester, container);

    expect(find.text('4K'), findsNothing);
    expect(find.text('HD'), findsNothing);
    expect(find.text('SD'), findsNothing,
        reason: 'Chips render only when the API provides the field.');
  });

  testWidgets('every library row carries See All, and it opens the grid screen',
      (tester) async {
    final container = createContainer();
    addTearDown(container.dispose);

    await pumpHome(tester, container);

    // Rows below the fold build lazily; scroll so every row exists first.
    await tester.drag(find.byType(ListView).first, const Offset(0, -800));
    await tester.pumpAndSettle();

    expect(find.text('See All'), findsNWidgets(3),
        reason: 'FR-4: Recently Added, Movies, and TV Shows rows.');

    await tester.drag(find.byType(ListView).first, const Offset(0, 800));
    await tester.pumpAndSettle();
    await tester.tap(find.text('See All').first);
    await tester.pumpAndSettle();

    expect(find.byType(SeeAllScreen), findsOneWidget);
    expect(find.text('Recently Added'), findsWidgets);
  });
}
