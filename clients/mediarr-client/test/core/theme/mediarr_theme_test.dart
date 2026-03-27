import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/core/theme/mediarr_theme.dart';

void main() {
  group('MediarrColors', () {
    test('surface colors are defined', () {
      expect(MediarrColors.surfaceBase, isNotNull);
      expect(MediarrColors.surfaceCard, isNotNull);
      expect(MediarrColors.surfaceElevated, isNotNull);
      expect(MediarrColors.surfaceHover, isNotNull);
    });

    test('accent colors are defined', () {
      expect(MediarrColors.accentPrimary, isNotNull);
      expect(MediarrColors.accentSecondary, isNotNull);
      expect(MediarrColors.accentTertiary, isNotNull);
    });

    test('text colors are defined', () {
      expect(MediarrColors.textPrimary, isNotNull);
      expect(MediarrColors.textSecondary, isNotNull);
      expect(MediarrColors.textMuted, isNotNull);
    });

    test('status colors are defined', () {
      expect(MediarrColors.statusSuccess, isNotNull);
      expect(MediarrColors.statusWarning, isNotNull);
      expect(MediarrColors.statusError, isNotNull);
      expect(MediarrColors.statusInfo, isNotNull);
    });
  });

  group('mediarrDarkTheme', () {
    test('is dark brightness', () {
      expect(mediarrDarkTheme.brightness, Brightness.dark);
    });

    test('uses Material 3', () {
      expect(mediarrDarkTheme.useMaterial3, true);
    });

    test('scaffold background is surfaceBase', () {
      expect(
        mediarrDarkTheme.scaffoldBackgroundColor,
        MediarrColors.surfaceBase,
      );
    });

    test('color scheme primary is accentPrimary', () {
      expect(
        mediarrDarkTheme.colorScheme.primary,
        MediarrColors.accentPrimary,
      );
    });

    test('card theme uses surfaceCard color', () {
      expect(mediarrDarkTheme.cardTheme.color, MediarrColors.surfaceCard);
    });

    testWidgets('theme applies correctly to a MaterialApp', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: mediarrDarkTheme,
          home: const Scaffold(
            body: Text('Test'),
          ),
        ),
      );

      final scaffold = tester.widget<Scaffold>(find.byType(Scaffold));
      // Scaffold should inherit the dark background
      expect(
        Theme.of(tester.element(find.text('Test'))).brightness,
        Brightness.dark,
      );
    });
  });
}
