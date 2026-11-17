import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
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

    // Typed on the in-app keyboard: the screen has no TextField (a focused text
    // input hands the remote to Android's system IME).
    for (final letter in ['A', 'L', 'I', 'E', 'N']) {
      await tester.tap(find.text(letter));
      await tester.pump();
    }
    await tester.pump(const Duration(milliseconds: 300));
    await tester.pump(const Duration(milliseconds: 300));
    await tester.pump();

    // The D-pad keyboard only has capitals; the server search is
    // case-insensitive, so the contract is the characters, not their case.
    expect(api.lastLibrarySearchQuery?.toLowerCase(), 'alien');
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

  testWidgets('no text field exists, and focus can still leave the keyboard',
      (tester) async {
    // Two contracts in one place:
    // 1. There is no TextField, so the system IME can never appear (owner
    //    report 2026-11-17: "once I was in the search text area, I was unable to
    //    leave").
    // 2. The keyboard is not a focus island: arrows walk out of it to the filter
    //    chips and down to the results.
    tester.view.physicalSize = const Size(1920, 1080);
    tester.view.devicePixelRatio = 1.5;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final api = FakeMediarrApiClient()
      ..librarySearchReturn = const [
        LibrarySearchItem(type: 'movie', id: 1, title: 'The Blues Brothers', year: 1980),
      ];
    await tester.pumpWidget(
      ProviderScope(
        overrides: [apiClientProvider.overrideWith((ref) => api)],
        child: MaterialApp(theme: mediarrDarkTheme, home: const SearchScreen()),
      ),
    );
    await tester.pump();

    expect(find.byType(TextField), findsNothing);
    expect(find.byType(EditableText), findsNothing);

    for (final letter in ['B', 'L', 'U', 'E', 'S']) {
      await tester.tap(find.text(letter));
      await tester.pump();
    }
    await tester.pump(const Duration(milliseconds: 300));
    await tester.pump(const Duration(milliseconds: 300));

    String label() => FocusManager.instance.primaryFocus?.debugLabel ?? '';

    // Walk right until focus leaves the keyboard (the keyboard keys are all
    // unlabelled FocusableActions; anything else means we left it).
    for (var i = 0; i < 12 && (label().isEmpty || label() == 'FocusableAction'); i++) {
      await tester.sendKeyEvent(LogicalKeyboardKey.arrowRight);
      await tester.pumpAndSettle();
    }
    // Then down into the hits.
    for (var i = 0; i < 12 && !label().contains('SearchResult'); i++) {
      await tester.sendKeyEvent(LogicalKeyboardKey.arrowDown);
      await tester.pumpAndSettle();
    }

    final focusLabel = label();
    expect(focusLabel, contains('SearchResult'),
        reason: 'A viewer must be able to reach the results with the D-pad; '
            'focus ended on "$focusLabel".');
  });
}
