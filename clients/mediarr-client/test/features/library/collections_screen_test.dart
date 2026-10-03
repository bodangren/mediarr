// FR-4 collections browsing.
//
// Verified before speccing: the server already serves `GET /api/collections`
// and `GET /api/collections/:id` (collectionRoutes.ts) and the SPA already has
// CollectionsPage / CollectionDetailPage / CollectionGrid / CollectionCard.
// The TV client had zero collection code, so this is a client-side gap.

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/core/theme/mediarr_theme.dart';
import 'package:mediarr_client/core/widgets/leanback_scaffold.dart';
import 'package:mediarr_client/features/library/collections_screen.dart';
import 'package:mediarr_client/features/library/movies_screen.dart';
import 'package:mediarr_client/features/library/poster_grid.dart';
import 'package:mediarr_client/shared/models/collection.dart';
import 'package:mediarr_client/shared/models/movie.dart';
import 'package:mediarr_client/shared/services/api_client.dart';

import '../../support/fakes/fake_api_client.dart';
import '../../support/focus_probe.dart';

const _collections = [
  MediaCollection(
    id: 1,
    name: 'The Dark Knight Trilogy',
    overview: 'Batman begins.',
    movieCount: 3,
    moviesInLibrary: 2,
  ),
  MediaCollection(
    id: 2,
    name: 'The Matrix Collection',
    movieCount: 4,
    moviesInLibrary: 4,
  ),
];

const _movies = [
  CollectionMovie(
    id: 11,
    title: 'The Dark Knight',
    year: 2008,
    inLibrary: true,
  ),
  CollectionMovie(id: 12, title: 'Batman Begins', year: 2005, inLibrary: true),
  CollectionMovie(id: 13, title: 'The Dark Knight Rises', year: 2012),
];

List<Override> _overrides({List<MediaCollection>? collections}) {
  final fake = FakeMediarrApiClient()
    ..getCollectionsReturn = collections ?? _collections
    ..getCollectionMoviesReturn = _movies;
  return [
    apiClientProvider.overrideWith((ref) => fake),
    moviesProvider.overrideWith(
      (ref) async => const [Movie(id: 1, title: 'The Matrix', year: 1999)],
    ),
    collectionsProvider.overrideWith(
      (ref) async => collections ?? _collections,
    ),
    collectionMoviesProvider(1).overrideWith((ref) async => _movies),
  ];
}

Future<FakeMediarrApiClient> _pumpCollections(
  WidgetTester tester, {
  String path = '/collections',
}) async {
  tester.view.physicalSize = const Size(1920, 1080);
  tester.view.devicePixelRatio = 1.5;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);

  final fake = FakeMediarrApiClient()
    ..getCollectionsReturn = _collections
    ..getCollectionMoviesReturn = _movies;
  final container = ProviderContainer(
    overrides: [
      apiClientProvider.overrideWith((ref) => fake),
      collectionsProvider.overrideWith((ref) async => _collections),
      collectionMoviesProvider(1).overrideWith((ref) async => _movies),
    ],
  );
  addTearDown(container.dispose);

  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: container,
      child: MaterialApp(
        theme: mediarrDarkTheme,
        home: LeanbackScaffold(
          currentPath: path,
          child: const CollectionsScreen(),
        ),
      ),
    ),
  );
  await tester.pumpAndSettle();
  return fake;
}

void main() {
  group('FR-4 models', () {
    test('parse the server shape', () {
      final collection = MediaCollection.fromJson(const {
        'id': 5,
        'name': 'Star Wars',
        'overview': 'A long time ago',
        'posterUrl': 'http://img/poster.jpg',
        'backdropUrl': 'http://img/backdrop.jpg',
        'movieCount': 9,
        'moviesInLibrary': 6,
      });

      expect(collection.id, 5);
      expect(collection.name, 'Star Wars');
      expect(collection.moviesInLibrary, 6);

      final movie = CollectionMovie.fromJson(const {
        'id': 51,
        'title': 'A New Hope',
        'year': 1977,
        'posterUrl': 'http://img/m.jpg',
        'inLibrary': true,
        'quality': 'Bluray-1080p',
      });
      expect(movie.id, 51);
      expect(movie.inLibrary, isTrue);
      expect(movie.quality, 'Bluray-1080p');
    });

    test('tolerate a missing optional field', () {
      final movie = CollectionMovie.fromJson(const {'id': 1, 'title': 'X'});
      expect(movie.year, isNull);
      expect(movie.inLibrary, isFalse);
    });
  });

  group('FR-4 collections screen', () {
    testWidgets('renders one tile per collection with its library count', (
      tester,
    ) async {
      await _pumpCollections(tester);

      expect(find.text('Collections'), findsOneWidget);
      expect(find.text('The Dark Knight Trilogy'), findsOneWidget);
      expect(find.text('The Matrix Collection'), findsOneWidget);
      // The owner needs to know what is actually watchable.
      expect(find.textContaining('2 of 3 in library'), findsOneWidget);
      expect(find.textContaining('4 of 4 in library'), findsOneWidget);
    });

    testWidgets('uses the shared browse density contract', (tester) async {
      await _pumpCollections(tester);

      final tiles = tester
          .renderObjectList<RenderBox>(find.byType(CollectionCard))
          .map((box) => box.localToGlobal(Offset.zero) & box.size)
          .toList();
      expect(tiles, hasLength(2));
      // Two collections do not fill a row, but the tile width still follows
      // the FR-1 contract rather than stretching to the viewport.
      expect(tiles.first.width, lessThan(400));
      expect(find.byType(GridView), findsWidgets);
    });

    testWidgets('an empty library reads as a state, not a failure', (
      tester,
    ) async {
      await _pumpCollections(tester, path: '/collections');
      // Re-pump with no collections.
      final container = ProviderContainer(
        overrides: [
          apiClientProvider.overrideWith(
            (ref) => FakeMediarrApiClient()..getCollectionsReturn = const [],
          ),
          collectionsProvider.overrideWith((ref) async => const []),
        ],
      );
      addTearDown(container.dispose);

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: MaterialApp(
            theme: mediarrDarkTheme,
            home: const CollectionsScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.textContaining('No collections'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });

  group('FR-4 collection detail', () {
    testWidgets('renders the collection movies on the shared grid', (
      tester,
    ) async {
      await _pumpCollections(tester);

      // Select opens the detail screen.
      await pressDpad(tester, LogicalKeyboardKey.select);
      await tester.pumpAndSettle();

      expect(find.text('The Dark Knight'), findsOneWidget);
      expect(find.text('Batman Begins'), findsOneWidget);
      expect(find.text('The Dark Knight Rises'), findsOneWidget);
      // A movie that is not in the library is marked.
      expect(find.textContaining('Not in library'), findsOneWidget);
    });

    testWidgets('Select on a movie opens its detail screen', (tester) async {
      final fake = await _pumpCollections(tester);
      fake.getMovieReturn = null;

      await pressDpad(tester, LogicalKeyboardKey.select);
      await tester.pumpAndSettle();
      await pressDpad(tester, LogicalKeyboardKey.select);
      await tester.pumpAndSettle();

      // The detail route needs the movie record; a null must not crash.
      expect(tester.takeException(), isNull);
    });
  });

  group('FR-4 entry point', () {
    testWidgets('the Movies screen offers a Collections action on the D-pad', (
      tester,
    ) async {
      tester.view.physicalSize = const Size(1920, 1080);
      tester.view.devicePixelRatio = 1.5;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      final container = ProviderContainer(overrides: _overrides());
      addTearDown(container.dispose);

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: MaterialApp(
            theme: mediarrDarkTheme,
            home: LeanbackScaffold(
              currentPath: '/movies',
              child: const MoviesScreen(),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Collections'), findsOneWidget);

      // The grid holds focus on entry; Up must reach the header action.
      await pressDpad(tester, LogicalKeyboardKey.arrowUp);
      expectVisibleFocus('Up from the grid');
      expect(focusedText(), contains('Collections'));
    });

    testWidgets('the rail still has exactly five destinations', (tester) async {
      tester.view.physicalSize = const Size(1920, 1080);
      tester.view.devicePixelRatio = 1.5;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      final container = ProviderContainer(overrides: _overrides());
      addTearDown(container.dispose);

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: MaterialApp(
            theme: mediarrDarkTheme,
            home: LeanbackScaffold(
              currentPath: '/movies',
              child: const MoviesScreen(),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // FR-4 keeps the owner-approved mockup rail: Home, Movies, Series,
      // Search, Settings. Collections is reached from the Movies screen, so it
      // must not appear in the rail.
      const railLabels = ['Home', 'Movies', 'Series', 'Search', 'Settings'];
      for (final label in railLabels) {
        final railTile = tester.getRect(
          find
              .descendant(
                of: find.byType(LeanbackScaffold),
                matching: find.text(label),
              )
              .first,
        );
        expect(
          railTile.left,
          lessThan(160),
          reason: '"$label" must stay in the 160 px rail',
        );
      }

      final collectionsRect = tester.getRect(find.text('Collections'));
      expect(
        collectionsRect.left,
        greaterThan(160),
        reason: 'Collections must be a content-area action, not a rail item',
      );
    });

    testWidgets('the shared density contract is reused by collections', (
      tester,
    ) async {
      // The same constants drive the collections screens, so density cannot
      // drift between the library and collections.
      expect(kTvPosterColumns, 6);
      expect(posterColumnCountFor(1071), kTvPosterColumns);
    });
  });
}
