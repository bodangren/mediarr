// FR-1 browse grid density contract, measured at the REAL device viewport.
//
// Device facts (`adb shell wm size` / `wm density`, 2026-10-03):
//   1920x1080 physical at density 240 => device pixel ratio 1.5
//   => app viewport 1280x720 LOGICAL px, rail 160 => content 1119 wide.
//
// Before this contract the grid resolved to 4 columns of 250x431 in a
// 1119x407.4 viewport: one visible row, clipped at the bottom. The target is
// 6 columns with at least 2 complete rows on screen.

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/core/theme/mediarr_theme.dart';
import 'package:mediarr_client/core/widgets/leanback_scaffold.dart';
import 'package:mediarr_client/features/home/home_screen.dart';
import 'package:mediarr_client/features/library/continue_watching_section.dart';
import 'package:mediarr_client/features/library/movies_screen.dart';
import 'package:mediarr_client/features/library/poster_grid.dart';
import 'package:mediarr_client/features/library/series_screen.dart';
import 'package:mediarr_client/shared/models/library_item.dart';
import 'package:mediarr_client/shared/models/movie.dart';
import 'package:mediarr_client/shared/models/series.dart';
import 'package:mediarr_client/shared/services/api_client.dart';
import 'package:mediarr_client/shared/widgets/poster_card.dart';

import '../../support/fakes/fake_api_client.dart';

/// Logical viewport of the TV this client runs on.
const Size tvPhysical = Size(1920, 1080);
const double tvDevicePixelRatio = 1.5;

List<Movie> _movies() => List.generate(
      24,
      (i) => Movie(id: i + 1, title: 'Movie ${i + 1}', year: 1990 + i),
    );

List<Series> _series() => List.generate(
      24,
      (i) => Series(id: i + 1, title: 'Series ${i + 1}', year: 1990 + i),
    );

List<Override> _overrides() => [
      apiClientProvider.overrideWith((ref) => FakeMediarrApiClient()),
      moviesProvider.overrideWith((ref) async => _movies()),
      seriesListProvider.overrideWith((ref) async => _series()),
      continueWatchingProvider.overrideWith((ref) async => [
            ContinueWatchingItem(
              mediaType: 'episode',
              mediaId: 11,
              title: 'Rick and Morty',
              position: 615,
              duration: 1320,
              progress: 0.47,
              lastWatched: DateTime(2026, 10, 3),
              episodeTitle: 'Salute Your Morts',
            ),
          ]),
      homeMoviesProvider.overrideWith((ref) async => _movies()),
      homeSeriesProvider.overrideWith((ref) async => _series()),
      recentlyAddedProvider.overrideWith((ref) async => [
            LibraryItem(id: 1, title: 'Movie 1', type: 'movie', year: 1999),
          ]),
      upcomingProvider.overrideWith((ref) async => const []),
    ];

Future<void> _pumpAtTvViewport(
  WidgetTester tester,
  Widget child, {
  required String path,
}) async {
  tester.view.physicalSize = tvPhysical;
  tester.view.devicePixelRatio = tvDevicePixelRatio;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);

  final container = ProviderContainer(overrides: _overrides());
  addTearDown(container.dispose);

  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: container,
      child: MaterialApp(
        theme: mediarrDarkTheme,
        home: LeanbackScaffold(currentPath: path, child: child),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

/// Global rectangles of the laid-out poster tiles, in paint order.
List<Rect> _tiles(WidgetTester tester) => tester
    .renderObjectList<RenderBox>(find.byType(PosterCard))
    .map((box) => box.localToGlobal(Offset.zero) & box.size)
    .toList();

/// Number of tiles in the topmost row: tiles that share the smallest top edge.
int _columnsOfFirstRow(List<Rect> tiles) {
  if (tiles.isEmpty) return 0;
  final top = tiles.map((r) => r.top).reduce((a, b) => a < b ? a : b);
  return tiles.where((r) => (r.top - top).abs() < 1).length;
}

/// Number of complete rows fully inside [viewport].
///
/// Rows are the distinct top edges of the laid-out tiles.
int _completeRows(List<Rect> tiles, Rect viewport) {
  final tops = <double>{for (final tile in tiles) tile.top.roundToDouble()};
  var complete = 0;
  for (final top in tops) {
    final row = tiles.where((t) => (t.top - top).abs() < 1);
    if (row.isEmpty) continue;
    final bottom = row.map((r) => r.bottom).reduce((a, b) => a > b ? a : b);
    if (bottom <= viewport.bottom + 0.5) complete++;
  }
  return complete;
}

void _expectTvDensityContract(WidgetTester tester, String label) {
  final gridRect = tester.getRect(find.byType(GridView).first);
  final tiles = _tiles(tester);
  expect(tiles, isNotEmpty, reason: '$label rendered no posters');

  final columns = _columnsOfFirstRow(tiles);
  expect(
    columns,
    kTvPosterColumns,
    reason: '$label shows $columns posters in the first row at the TV '
        'viewport; the contract is $kTvPosterColumns (FR-1).',
  );

  // Tile size, with 5 % tolerance for pixel rounding.
  final first = tiles.first;
  expect(
    first.width,
    closeTo(kTvPosterTileWidth, kTvPosterTileWidth * 0.05),
    reason: '$label tile width is ${first.width.toStringAsFixed(1)} logical px; '
        'the contract is $kTvPosterTileWidth.',
  );
  expect(
    first.height,
    closeTo(kTvPosterTileHeight, kTvPosterTileHeight * 0.05),
    reason: '$label tile height is ${first.height.toStringAsFixed(1)} logical '
        'px; the contract is $kTvPosterTileHeight.',
  );

  final rows = _completeRows(tiles, gridRect);
  expect(
    rows,
    greaterThanOrEqualTo(kTvPosterVisibleRows),
    reason: '$label shows only $rows complete poster rows inside its '
        '${gridRect.height.toStringAsFixed(1)} px viewport; FR-1 requires '
        'at least $kTvPosterVisibleRows.',
  );

  expect(
    columns * rows,
    greaterThanOrEqualTo(12),
    reason: '$label shows $columns x $rows = ${columns * rows} posters per '
        'glance; FR-1 requires at least 12.',
  );
}

void main() {
  group('FR-1 browse grid density at 1280x720 logical', () {
    testWidgets('MoviesScreen lays out 6 columns and 2 full rows',
        (tester) async {
      await _pumpAtTvViewport(tester, const MoviesScreen(), path: '/movies');

      _expectTvDensityContract(tester, 'MoviesScreen');
    });

    testWidgets('SeriesScreen lays out 6 columns and 2 full rows',
        (tester) async {
      await _pumpAtTvViewport(tester, const SeriesScreen(), path: '/series');

      _expectTvDensityContract(tester, 'SeriesScreen');
    });

    testWidgets('the column count is derived from the available width',
        (tester) async {
      // The TV grid extent resolves to the pinned column count. It is 1071
      // logical px: 1280 viewport - 160 rail - 1 divider - 24 padding x 2.
      expect(posterColumnCountFor(1071), kTvPosterColumns);
      // A narrow desktop window still gets a usable grid, never zero or one.
      expect(posterColumnCountFor(320), greaterThanOrEqualTo(2));
      expect(posterColumnCountFor(320), lessThanOrEqualTo(kTvPosterColumns));
      // A wide desktop window gets more columns, not stretched posters.
      expect(posterColumnCountFor(2400), greaterThan(kTvPosterColumns));
      // Degenerate extents must not divide by zero.
      expect(posterColumnCountFor(0), kTvPosterColumns);
    });

    testWidgets('Continue Watching is off the browse screens but stays on Home',
        (tester) async {
      // Removed from Movies: it cost 213 of 720 logical px there (FR-1).
      await _pumpAtTvViewport(tester, const MoviesScreen(), path: '/movies');
      expect(find.byType(ContinueWatchingSection), findsNothing);
      expect(find.text('Continue Watching'), findsNothing);

      // Removed from Series for the same reason.
      await _pumpAtTvViewport(tester, const SeriesScreen(), path: '/series');
      expect(find.byType(ContinueWatchingSection), findsNothing);

      // Still on Home, where the owner-approved mockup puts it. This asserts
      // the removal did not take the feature away everywhere.
      await _pumpAtTvViewport(tester, const HomeScreen(), path: '/home');
      expect(find.byType(ContinueWatchingSection), findsOneWidget);
      expect(find.text('Continue Watching'), findsOneWidget);
    });
  });
}