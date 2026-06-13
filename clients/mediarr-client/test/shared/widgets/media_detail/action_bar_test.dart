import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/core/theme/mediarr_theme.dart';
import 'package:mediarr_client/shared/widgets/media_detail/action_bar.dart';

/// Widget tests for `ActionBar` — feature-agnostic button row used by
/// `MovieDetailScreen` (Phase 3) and `SeriesDetailScreen` (Phase 4).
///
/// Per `test-strategy.md` §4 guardrail #3: takes a list of `ActionBarAction`
/// records (label, icon, callback, isPrimary, isDestructive). Non-destructive
/// actions fire their callback directly. Destructive actions show an
/// `AlertDialog` confirmation and only fire the callback on confirm.
void main() {
  Widget buildTestApp({required Widget child}) {
    return MaterialApp(
      theme: mediarrDarkTheme,
      home: Scaffold(body: child),
    );
  }

  group('ActionBar', () {
    testWidgets('renders a button per action with the right label and icon',
        (tester) async {
      await tester.pumpWidget(buildTestApp(
        child: ActionBar(
          actions: const [
            ActionBarAction(
              label: 'Play',
              icon: Icons.play_arrow,
              isPrimary: true,
            ),
            ActionBarAction(
              label: 'Search Upgrades',
              icon: Icons.upgrade,
            ),
          ],
        ),
      ));

      expect(find.text('Play'), findsOneWidget);
      expect(find.text('Search Upgrades'), findsOneWidget);
      expect(find.byIcon(Icons.play_arrow), findsOneWidget);
      expect(find.byIcon(Icons.upgrade), findsOneWidget);
    });

    testWidgets('fires callback when non-destructive action is tapped',
        (tester) async {
      var playTaps = 0;

      await tester.pumpWidget(buildTestApp(
        child: ActionBar(
          actions: [
            ActionBarAction(
              label: 'Play',
              icon: Icons.play_arrow,
              isPrimary: true,
              onPressed: () => playTaps++,
            ),
          ],
        ),
      ));

      await tester.tap(find.text('Play'));
      await tester.pumpAndSettle();

      expect(playTaps, 1);
    });

    testWidgets('fires secondary action callback on tap', (tester) async {
      var searchTaps = 0;

      await tester.pumpWidget(buildTestApp(
        child: ActionBar(
          actions: [
            ActionBarAction(
              label: 'Search Upgrades',
              icon: Icons.upgrade,
              onPressed: () => searchTaps++,
            ),
          ],
        ),
      ));

      await tester.tap(find.text('Search Upgrades'));
      await tester.pumpAndSettle();

      expect(searchTaps, 1);
    });

    testWidgets('destructive action shows an AlertDialog before firing',
        (tester) async {
      var deleteTaps = 0;

      await tester.pumpWidget(buildTestApp(
        child: ActionBar(
          actions: [
            ActionBarAction(
              label: 'Delete',
              icon: Icons.delete,
              isDestructive: true,
              onPressed: () => deleteTaps++,
            ),
          ],
        ),
      ));

      // Tap the destructive action.
      await tester.tap(find.text('Delete'));
      await tester.pumpAndSettle();

      // AlertDialog is shown — callback has NOT fired yet.
      expect(find.byType(AlertDialog), findsOneWidget);
      expect(deleteTaps, 0);
    });

    testWidgets('confirming a destructive action fires the callback',
        (tester) async {
      var deleteTaps = 0;

      await tester.pumpWidget(buildTestApp(
        child: ActionBar(
          actions: [
            ActionBarAction(
              label: 'Delete',
              icon: Icons.delete,
              isDestructive: true,
              onPressed: () => deleteTaps++,
            ),
          ],
        ),
      ));

      await tester.tap(find.text('Delete'));
      await tester.pumpAndSettle();

      // Tap the Confirm button inside the AlertDialog.
      final confirmButton = find.descendant(
        of: find.byType(AlertDialog),
        matching: find.widgetWithText(TextButton, 'Delete'),
      );
      expect(confirmButton, findsOneWidget);
      await tester.tap(confirmButton);
      await tester.pumpAndSettle();

      // Dialog dismissed, callback fired exactly once.
      expect(find.byType(AlertDialog), findsNothing);
      expect(deleteTaps, 1);
    });

    testWidgets('cancelling a destructive dialog does not fire the callback',
        (tester) async {
      var deleteTaps = 0;

      await tester.pumpWidget(buildTestApp(
        child: ActionBar(
          actions: [
            ActionBarAction(
              label: 'Delete',
              icon: Icons.delete,
              isDestructive: true,
              onPressed: () => deleteTaps++,
            ),
          ],
        ),
      ));

      await tester.tap(find.text('Delete'));
      await tester.pumpAndSettle();

      final cancelButton = find.descendant(
        of: find.byType(AlertDialog),
        matching: find.widgetWithText(TextButton, 'Cancel'),
      );
      expect(cancelButton, findsOneWidget);
      await tester.tap(cancelButton);
      await tester.pumpAndSettle();

      // Dialog dismissed, callback did NOT fire.
      expect(find.byType(AlertDialog), findsNothing);
      expect(deleteTaps, 0);
    });
  });
}
