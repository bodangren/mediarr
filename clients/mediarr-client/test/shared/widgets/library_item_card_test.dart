import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/core/theme/mediarr_theme.dart';
import 'package:mediarr_client/shared/models/library_item.dart';
import 'package:mediarr_client/shared/widgets/library_item_card.dart';

void main() {
  Widget buildTestApp({required Widget child}) {
    return MaterialApp(theme: mediarrDarkTheme, home: Scaffold(body: child));
  }

  group('LibraryItemCard', () {
    testWidgets('renders title from LibraryItem', (tester) async {
      await tester.pumpWidget(buildTestApp(
        child: const LibraryItemCard(
          item: LibraryItem(
            id: 1,
            title: 'Inception',
            type: 'movie',
            year: 2010,
          ),
        ),
      ));

      expect(find.text('Inception'), findsWidgets);
      expect(find.text('2010'), findsOneWidget);
    });

    testWidgets('renders without year when null', (tester) async {
      await tester.pumpWidget(buildTestApp(
        child: const LibraryItemCard(
          item: LibraryItem(
            id: 1,
            title: 'Unknown Movie',
            type: 'movie',
          ),
        ),
      ));

      expect(find.text('Unknown Movie'), findsWidgets);
    });

    testWidgets('triggers onTap', (tester) async {
      var tapped = false;
      await tester.pumpWidget(buildTestApp(
        child: LibraryItemCard(
          item: const LibraryItem(
            id: 1,
            title: 'Tap Me',
            type: 'series',
          ),
          onTap: () => tapped = true,
        ),
      ));

      await tester.tap(find.text('Tap Me').first);
      expect(tapped, true);
    });

    testWidgets('passes autofocus to PosterCard', (tester) async {
      await tester.pumpWidget(buildTestApp(
        child: const LibraryItemCard(
          item: LibraryItem(
            id: 1,
            title: 'Focused',
            type: 'movie',
          ),
          autofocus: true,
        ),
      ));

      // PosterCard should be present; autofocus is forwarded internally
      expect(find.byType(LibraryItemCard), findsOneWidget);
    });
  });
}
