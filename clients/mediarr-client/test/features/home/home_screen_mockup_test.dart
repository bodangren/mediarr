import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/core/theme/mediarr_theme.dart';
import 'package:mediarr_client/core/widgets/netflix_scaffold.dart';
import 'package:mediarr_client/features/home/home_screen.dart';
import 'package:mediarr_client/features/library/continue_watching_section.dart';
import 'package:mediarr_client/features/library/see_all_screen.dart';
import 'package:mediarr_client/shared/models/library_item.dart';
import 'package:mediarr_client/shared/models/movie.dart';
import 'package:mediarr_client/shared/models/series.dart';
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

  testWidgets('hero hides quality chips for an Any quality profile',
      (tester) async {
    final container = createContainer(overrides: [
      heroMovieProvider.overrideWith((ref, id) async => Movie.fromJson({
            'id': 22,
            'title': 'The Matrix',
            'qualityProfile': {'id': 176, 'name': 'Any'},
          })),
    ]);
    addTearDown(container.dispose);

    await pumpHome(tester, container);

    expect(find.text('4K'), findsNothing);
    expect(find.text('HD'), findsNothing);
    expect(find.text('SD'), findsNothing,
        reason: 'An Any profile is no quality signal; the chip must not '
            'claim SD.');
  });

  testWidgets('hero uses the server backdropUrl as the full-bleed landscape art',
      (tester) async {
    final container = createContainer(overrides: [
      heroMovieProvider.overrideWith((ref, id) async => Movie.fromJson({
            'id': 22,
            'title': 'The Matrix',
            'year': 1999,
            'posterUrl': 'https://example.com/matrix-poster.jpg',
            'backdropUrl': 'https://example.com/matrix-fanart.jpg',
          })),
    ]);
    addTearDown(container.dispose);

    await pumpHome(tester, container);

    final images = tester
        .widgetList<CachedNetworkImage>(find.byType(CachedNetworkImage))
        .map((w) => w.imageUrl)
        .toList();
    expect(images, contains('https://example.com/matrix-fanart.jpg'),
        reason: 'FR-14: landscape art is the hero backdrop. The client reads '
            'the server row field `backdropUrl`.');
    expect(
      tester
          .widgetList<AspectRatio>(find.byType(AspectRatio))
          .where((w) => w.aspectRatio == 2 / 3),
      isEmpty,
      reason: 'With landscape art present the portrait poster tile is gone.',
    );
  });

  testWidgets('episode hero takes art, meta, and synopsis from its series',
      (tester) async {
    final container = createContainer(overrides: [
      continueWatchingProvider.overrideWith((ref) async => [
            ContinueWatchingItem(
              mediaType: 'episode',
              mediaId: 901,
              seriesId: 77,
              title: 'Rick and Morty',
              episodeTitle: "That's Amorte",
              seasonNumber: 9,
              episodeNumber: 9,
              position: 8,
              duration: 2580,
              progress: 0.01,
              lastWatched: DateTime(2026, 9, 25),
            ),
          ]),
      heroSeriesProvider.overrideWith((ref, id) async => Series.fromJson({
            'id': 77,
            'title': 'Rick and Morty',
            'year': 2013,
            'overview': 'A genius scientist drags his grandson along for '
                'interdimensional misadventures.',
            'posterUrl': 'https://example.com/rick-poster.jpg',
            'backdropUrl': 'https://example.com/rick-fanart.jpg',
            'qualityProfile': {'id': 2, 'name': 'HD-1080p'},
          })),
    ]);
    addTearDown(container.dispose);

    await pumpHome(tester, container);

    expect(find.text('S09E09 | 2013 | 43m'), findsOneWidget,
        reason: 'FR-2 meta line: episode label, series year, and the runtime '
            'derived from the played duration (2580 s = 43 m).');
    expect(find.textContaining('A genius scientist'), findsOneWidget,
        reason: 'FR-2: the hero shows the three-line synopsis.');
    expect(find.text('HD'), findsOneWidget,
        reason: 'FR-2 chip derived from the series quality profile name.');
    final images = tester
        .widgetList<CachedNetworkImage>(find.byType(CachedNetworkImage))
        .map((w) => w.imageUrl)
        .toList();
    expect(images, contains('https://example.com/rick-fanart.jpg'),
        reason: 'FR-14: the episode hero uses its series landscape art.');
  });

  testWidgets('hero actions Resume and Details are the same size',
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
              lastWatched: DateTime(2026, 9, 25),
            ),
          ]),
    ]);
    addTearDown(container.dispose);

    await pumpHome(tester, container);

    final resume = tester.getSize(
      find.ancestor(of: find.text('Resume'), matching: find.byType(FocusableAction)),
    );
    final details = tester.getSize(
      find.ancestor(of: find.text('Details'), matching: find.byType(FocusableAction)),
    );
    expect(resume.height, details.height,
        reason: 'The mockup shows both hero actions as equal pills.');
    expect(resume.height, greaterThanOrEqualTo(44));
  });

  testWidgets('TV viewport shows four continue cards and starts Recently Added',
      (tester) async {
    tester.view.physicalSize = const Size(1920, 1080);
    tester.view.devicePixelRatio = 1.5;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final watchingItems = List.generate(
      4,
      (index) => ContinueWatchingItem(
        mediaType: 'movie',
        mediaId: index + 1,
        title: 'Continue ${index + 1}',
        position: 300,
        duration: 1200,
        progress: 0.25,
        lastWatched: DateTime(2026, 9, 24),
        backdropUrl: 'https://example.com/backdrop-${index + 1}.jpg',
      ),
    );
    final container = createContainer(overrides: [
      continueWatchingProvider.overrideWith((ref) async => watchingItems),
      recentlyAddedProvider.overrideWith((ref) async => List.generate(
            8,
            (index) => LibraryItem(
              id: index + 1,
              title: 'Recent ${index + 1}',
              type: 'movie',
              year: 2026,
            ),
          )),
    ]);
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

    expect(find.text('Continue 1'), findsNWidgets(2));
    for (var index = 2; index <= 4; index++) {
      expect(find.text('Continue $index'), findsOneWidget);
    }
    expect(find.text('Recently Added'), findsOneWidget);
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
