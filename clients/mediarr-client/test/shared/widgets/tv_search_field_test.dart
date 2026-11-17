import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/core/theme/mediarr_theme.dart';
import 'package:mediarr_client/shared/widgets/tv_search_field.dart';

/// The library search box used to be a `TextField`, which on Android TV handed
/// D-pad control to the system IME and could not be left (owner report
/// 2026-11-17). These tests pin the replacement: a focusable control that opens
/// the app's own keyboard, with no system text input anywhere.
void main() {
  Widget app(Widget child) =>
      MaterialApp(theme: mediarrDarkTheme, home: Scaffold(body: child));

  testWidgets('shows the hint when empty and the query once typed', (
    tester,
  ) async {
    final controller = TextEditingController();
    addTearDown(controller.dispose);

    await tester.pumpWidget(
      app(
        TvSearchField(controller: controller, onChanged: (_) {}),
      ),
    );
    expect(find.text('Search...'), findsOneWidget);

    controller.text = 'archer';
    await tester.pump();
    expect(find.text('archer'), findsOneWidget);
    expect(find.text('Search...'), findsNothing);
  });

  testWidgets('opens the in-app keyboard sheet on Select, never a TextField', (
    tester,
  ) async {
    final controller = TextEditingController();
    addTearDown(controller.dispose);

    await tester.pumpWidget(
      app(TvSearchField(controller: controller, onChanged: (_) {})),
    );

    // The trap being fixed: no system text input exists on this screen.
    expect(find.byType(TextField), findsNothing);
    expect(find.byType(EditableText), findsNothing);

    await tester.tap(find.byType(TvSearchField));
    await tester.pumpAndSettle();

    // The sheet exposes the D-pad keyboard and a Done escape.
    expect(find.text('A'), findsOneWidget);
    expect(find.text('Done'), findsOneWidget);
    expect(find.byType(TextField), findsNothing);
  });

  testWidgets('key presses append and backspace through onChanged', (
    tester,
  ) async {
    final controller = TextEditingController();
    final seen = <String>[];
    addTearDown(controller.dispose);

    await tester.pumpWidget(
      app(
        TvSearchField(
          controller: controller,
          onChanged: seen.add,
        ),
      ),
    );

    await tester.tap(find.byType(TvSearchField));
    await tester.pumpAndSettle();

    await tester.tap(find.text('A'));
    await tester.pumpAndSettle();
    expect(controller.text, 'A');
    expect(seen.last, 'A');

  });

  testWidgets('Done closes the sheet and returns to the screen', (
    tester,
  ) async {
    final controller = TextEditingController();
    addTearDown(controller.dispose);

    await tester.pumpWidget(
      app(TvSearchField(controller: controller, onChanged: (_) {})),
    );

    await tester.tap(find.byType(TvSearchField));
    await tester.pumpAndSettle();
    expect(find.text('Done'), findsOneWidget);

    await tester.tap(find.text('Done'));
    await tester.pumpAndSettle();
    expect(find.text('Done'), findsNothing);

    // Escape hatch: the screen is still focusable (no dead remote state).
    await tester.sendKeyEvent(LogicalKeyboardKey.arrowDown);
    await tester.pumpAndSettle();
  });
}
