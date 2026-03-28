import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/core/theme/mediarr_theme.dart';
import 'package:mediarr_client/features/library/movies_screen.dart';
import 'package:mediarr_client/shared/models/movie.dart';

void main() {
  group('MoviesScreen', () {
    testWidgets('shows loading state', (tester) async {
      // Override with a provider that never resolves
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            moviesProvider.overrideWith((ref) async {
              // Never resolves — stays in loading state
              await Completer<void>().future;
              return <Movie>[];
            }),
          ],
          child: MaterialApp(
            theme: mediarrDarkTheme,
            home: const Scaffold(body: MoviesScreen()),
          ),
        ),
      );

      expect(find.text('Movies'), findsOneWidget);
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('shows movie list when data loaded', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            moviesProvider.overrideWith((ref) async => [
                  const Movie(
                    id: 1,
                    title: 'Inception',
                    year: 2010,
                    monitored: true,
                    hasFile: true,
                    quality: '1080p',
                  ),
                  const Movie(
                    id: 2,
                    title: 'The Matrix',
                    year: 1999,
                    monitored: true,
                  ),
                ]),
          ],
          child: MaterialApp(
            theme: mediarrDarkTheme,
            home: const Scaffold(body: MoviesScreen()),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Movies'), findsOneWidget);
      expect(find.text('Inception'), findsWidgets);
      expect(find.text('The Matrix'), findsWidgets);
    });

    testWidgets('shows empty state when no movies', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            moviesProvider.overrideWith((ref) async => <Movie>[]),
          ],
          child: MaterialApp(
            theme: mediarrDarkTheme,
            home: const Scaffold(body: MoviesScreen()),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('No movies in library'), findsOneWidget);
    });

    testWidgets('shows error state on failure', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            moviesProvider.overrideWith((ref) async {
              throw Exception('Network error');
            }),
          ],
          child: MaterialApp(
            theme: mediarrDarkTheme,
            home: const Scaffold(body: MoviesScreen()),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.textContaining('Failed to load'), findsOneWidget);
    });
  });
}
