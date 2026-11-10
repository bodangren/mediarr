import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/core/theme/mediarr_theme.dart';
import 'package:mediarr_client/features/search/search_screen.dart';
import 'package:mediarr_client/shared/models/library_search_item.dart';
import 'package:mediarr_client/shared/services/api_client.dart';

import '../../support/fakes/fake_api_client.dart';

void main() {
  testWidgets('search queries the server after the debounce and shows typed results',
      (tester) async {
    tester.view.physicalSize = const Size(1280, 720);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final api = FakeMediarrApiClient()
      ..librarySearchReturn = const [
        LibrarySearchItem(type: 'movie', id: 1, title: 'Alien', year: 1979),
        LibrarySearchItem(type: 'series', id: 2, title: 'Alien Nation', year: 1989),
        LibrarySearchItem(
          type: 'episode',
          id: 3,
          title: 'Alien Ship',
          subtitle: 'Alien Nation',
          seriesId: 2,
          seasonNumber: 1,
          episodeNumber: 2,
        ),
      ];

    await tester.pumpWidget(
      ProviderScope(
        overrides: [apiClientProvider.overrideWith((ref) => api)],
        child: MaterialApp(theme: mediarrDarkTheme, home: const SearchScreen()),
      ),
    );
    await tester.pump();

    expect(find.textContaining('Type to search'), findsOneWidget);

    await tester.enterText(find.byType(TextField), 'alien');
    await tester.pump(const Duration(milliseconds: 300));
    await tester.pump();

    expect(api.lastLibrarySearchQuery, 'alien');
    expect(find.textContaining('Movies · 1'), findsOneWidget);
    expect(find.textContaining('Series · 1'), findsOneWidget);
    expect(find.textContaining('Episodes · 1'), findsOneWidget);
    // Ranked sections: each type gets its own header above its own grid.
    expect(find.text('Movies'), findsOneWidget);
    expect(find.text('TV series'), findsOneWidget);

    // The episodes section is below the fold; a TV user scrolls to it.
    final resultsScrollable = find
        .descendant(of: find.byType(ListView).first, matching: find.byType(Scrollable))
        .first;
    await tester.scrollUntilVisible(
      find.textContaining('S01E02'),
      240,
      scrollable: resultsScrollable,
    );
    await tester.pump();
    expect(find.text('Episodes'), findsOneWidget);
    expect(find.text('S01E02'), findsNothing); // context line combines series + label
    expect(find.textContaining('S01E02'), findsOneWidget);
  });

  testWidgets('the D-pad keyboard builds the query and runs the search',
      (tester) async {
    tester.view.physicalSize = const Size(1280, 720);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final api = FakeMediarrApiClient()
      ..librarySearchReturn = const [
        LibrarySearchItem(type: 'movie', id: 1, title: 'Alien', year: 1979),
      ];

    await tester.pumpWidget(
      ProviderScope(
        overrides: [apiClientProvider.overrideWith((ref) => api)],
        child: MaterialApp(theme: mediarrDarkTheme, home: const SearchScreen()),
      ),
    );
    await tester.pump();

    for (final letter in ['A', 'L', 'I', 'E', 'N']) {
      await tester.tap(find.text(letter));
      await tester.pump();
    }
    await tester.pump(const Duration(milliseconds: 300));
    await tester.pump();

    expect(api.lastLibrarySearchQuery, 'ALIEN');
    expect(find.textContaining('Movies · 1'), findsOneWidget);

    // Backspace removes the last character and searches again.
    await tester.tap(find.byIcon(Icons.backspace_outlined));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));
    await tester.pump();
    expect(api.lastLibrarySearchQuery, 'ALIE');

    // Clear empties the query and returns to the prompt.
    await tester.tap(find.byIcon(Icons.clear));
    await tester.pump();
    expect(find.textContaining('Type to search'), findsOneWidget);
  });
}
