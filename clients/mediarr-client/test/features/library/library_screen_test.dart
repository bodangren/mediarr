import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/core/theme/mediarr_theme.dart';
import 'package:mediarr_client/features/library/library_screen.dart';
import 'package:mediarr_client/shared/models/library_item.dart';

void main() {
  group('LibraryScreen', () {
    testWidgets('shows loading state initially', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            libraryProvider.overrideWith((ref, query) async {
              await Completer<void>().future;
              return (items: <LibraryItem>[], totalCount: 0, totalPages: 0);
            }),
          ],
          child: MaterialApp(
            theme: mediarrDarkTheme,
            home: const Scaffold(body: LibraryScreen()),
          ),
        ),
      );

      expect(find.text('Movies'), findsOneWidget);
      expect(find.text('TV Shows'), findsOneWidget);
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('shows movie grid when data loaded', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            libraryProvider.overrideWith((ref, query) async {
              return (
                items: [
                  const LibraryItem(
                    id: 1,
                    title: 'Inception',
                    type: 'movie',
                    year: 2010,
                  ),
                  const LibraryItem(
                    id: 2,
                    title: 'The Matrix',
                    type: 'movie',
                    year: 1999,
                  ),
                ],
                totalCount: 2,
                totalPages: 1,
              );
            }),
          ],
          child: MaterialApp(
            theme: mediarrDarkTheme,
            home: const Scaffold(body: LibraryScreen()),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Inception').first, findsOneWidget);
      expect(find.text('The Matrix').first, findsOneWidget);
    });

    testWidgets('shows empty state when no items', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            libraryProvider.overrideWith((ref, query) async {
              return (
                items: <LibraryItem>[],
                totalCount: 0,
                totalPages: 0,
              );
            }),
          ],
          child: MaterialApp(
            theme: mediarrDarkTheme,
            home: const Scaffold(body: LibraryScreen()),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Your library is empty'), findsOneWidget);
      expect(find.text('Add Media'), findsOneWidget);
    });

    testWidgets('shows error state on failure', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            libraryProvider.overrideWith((ref, query) async {
              throw Exception('Network error');
            }),
          ],
          child: MaterialApp(
            theme: mediarrDarkTheme,
            home: const Scaffold(body: LibraryScreen()),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.textContaining('Failed to load'), findsOneWidget);
    });
  });
}
