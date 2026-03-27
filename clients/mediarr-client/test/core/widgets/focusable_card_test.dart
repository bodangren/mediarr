import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/core/widgets/focusable_card.dart';
import 'package:mediarr_client/core/theme/mediarr_theme.dart';

void main() {
  Widget buildTestApp({
    required Widget child,
  }) {
    return MaterialApp(
      theme: mediarrDarkTheme,
      home: Scaffold(body: child),
    );
  }

  group('FocusableCard', () {
    testWidgets('renders child widget', (tester) async {
      await tester.pumpWidget(
        buildTestApp(
          child: const FocusableCard(
            child: Text('Test Card'),
          ),
        ),
      );

      expect(find.text('Test Card'), findsOneWidget);
    });

    testWidgets('triggers onPressed on tap', (tester) async {
      var pressed = false;
      await tester.pumpWidget(
        buildTestApp(
          child: FocusableCard(
            onPressed: () => pressed = true,
            child: const Text('Tap Me'),
          ),
        ),
      );

      await tester.tap(find.text('Tap Me'));
      expect(pressed, true);
    });

    testWidgets('shows focus ring when focused', (tester) async {
      final focusNode = FocusNode();
      await tester.pumpWidget(
        buildTestApp(
          child: FocusableCard(
            focusNode: focusNode,
            child: const Text('Focus Me'),
          ),
        ),
      );

      // Initially not focused — border should be subtle
      focusNode.requestFocus();
      await tester.pumpAndSettle();

      // The AnimatedContainer should now show the focus ring
      final container = tester.widget<AnimatedContainer>(
        find.byType(AnimatedContainer),
      );
      final decoration = container.decoration as BoxDecoration;
      expect(decoration.border, isNotNull);
      expect(
        (decoration.border as Border).top.color,
        MediarrColors.focusRing,
      );

      focusNode.dispose();
    });

    testWidgets('scales up when focused', (tester) async {
      final focusNode = FocusNode();
      await tester.pumpWidget(
        buildTestApp(
          child: FocusableCard(
            focusNode: focusNode,
            child: const Text('Scale Me'),
          ),
        ),
      );

      focusNode.requestFocus();
      await tester.pumpAndSettle();

      final container = tester.widget<AnimatedContainer>(
        find.byType(AnimatedContainer),
      );
      // Scale transform should be 1.05 when focused
      expect(container.transform, isNot(Matrix4.identity()));

      focusNode.dispose();
    });

    testWidgets('removes focus ring when unfocused', (tester) async {
      final focusNode1 = FocusNode();
      final focusNode2 = FocusNode();
      await tester.pumpWidget(
        buildTestApp(
          child: Column(
            children: [
              FocusableCard(
                focusNode: focusNode1,
                child: const Text('Card 1'),
              ),
              FocusableCard(
                focusNode: focusNode2,
                child: const Text('Card 2'),
              ),
            ],
          ),
        ),
      );

      // Focus card 1
      focusNode1.requestFocus();
      await tester.pumpAndSettle();

      // Move focus to card 2
      focusNode2.requestFocus();
      await tester.pumpAndSettle();

      // Card 1 should no longer have focus ring
      final containers = tester.widgetList<AnimatedContainer>(
        find.byType(AnimatedContainer),
      ).toList();

      final firstDecoration = containers[0].decoration as BoxDecoration;
      expect(
        (firstDecoration.border as Border).top.color,
        MediarrColors.borderSubtle,
      );

      focusNode1.dispose();
      focusNode2.dispose();
    });

    testWidgets('autofocus works', (tester) async {
      await tester.pumpWidget(
        buildTestApp(
          child: const FocusableCard(
            autofocus: true,
            child: Text('Auto Focus'),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // The card should have focus automatically
      final container = tester.widget<AnimatedContainer>(
        find.byType(AnimatedContainer),
      );
      final decoration = container.decoration as BoxDecoration;
      expect(
        (decoration.border as Border).top.color,
        MediarrColors.focusRing,
      );
    });

    testWidgets('handles D-pad navigation between cards', (tester) async {
      await tester.pumpWidget(
        buildTestApp(
          child: Column(
            children: const [
              FocusableCard(
                autofocus: true,
                child: Text('Card A'),
              ),
              FocusableCard(
                child: Text('Card B'),
              ),
            ],
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Card A should have focus initially
      var containers = tester.widgetList<AnimatedContainer>(
        find.byType(AnimatedContainer),
      ).toList();
      var firstDeco = containers[0].decoration as BoxDecoration;
      expect((firstDeco.border as Border).top.color, MediarrColors.focusRing);

      // Press down arrow to move focus to Card B
      await tester.sendKeyEvent(LogicalKeyboardKey.arrowDown);
      await tester.pumpAndSettle();

      containers = tester.widgetList<AnimatedContainer>(
        find.byType(AnimatedContainer),
      ).toList();
      final secondDeco = containers[1].decoration as BoxDecoration;
      expect((secondDeco.border as Border).top.color, MediarrColors.focusRing);
    });
  });
}
