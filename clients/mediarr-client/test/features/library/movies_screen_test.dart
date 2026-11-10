import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/core/theme/mediarr_theme.dart';
import 'package:mediarr_client/features/library/continue_watching_section.dart';
import 'package:mediarr_client/features/library/movies_screen.dart';
import 'package:mediarr_client/shared/models/movie.dart';
import 'package:mediarr_client/shared/services/api_client.dart';

void main() {
  group('MoviesScreen', () {
    testWidgets('shows loading state', (tester) async {
      // Override with a provider that never resolves
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            continueWatchingProvider.overrideWith(
              (ref) async => <ContinueWatchingItem>[],
            ),
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
      // At least one spinner is showing while data loads (could be from the
      // MoviesScreen body or the ContinueWatchingSection's loading state).
      expect(find.byType(CircularProgressIndicator), findsWidgets);
    });

    testWidgets('shows movie list when data loaded', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            continueWatchingProvider.overrideWith((ref) async => <ContinueWatchingItem>[]),
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
            continueWatchingProvider.overrideWith((ref) async => <ContinueWatchingItem>[]),
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
            continueWatchingProvider.overrideWith((ref) async => <ContinueWatchingItem>[]),
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

    testWidgets('a narrowed view shows active chips and Play filtered',
        (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            continueWatchingProvider.overrideWith((ref) async => <ContinueWatchingItem>[]),
            movieLibraryQueryProvider.overrideWith(
              (ref) => const MovieLibraryQuery(monitored: true),
            ),
            moviesProvider.overrideWith((ref) async => [
                  const Movie(
                    id: 1,
                    title: 'Inception',
                    year: 2010,
                    monitored: true,
                    hasFile: true,
                  ),
                  const Movie(
                    id: 2,
                    title: 'The Matrix',
                    year: 1999,
                    monitored: false,
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

      expect(find.text('Monitored'), findsOneWidget);
      expect(find.text('Play filtered'), findsOneWidget);
      expect(find.text('Clear view'), findsOneWidget);

      // Tapping the active chip clears that facet and the strip goes away.
      await tester.tap(find.text('Monitored'));
      await tester.pumpAndSettle();
      expect(find.text('Monitored'), findsNothing);
      expect(find.text('Play filtered'), findsNothing);
    });

    testWidgets('Back from a movie detail restores the opened poster focus',
        (tester) async {
      tester.view.physicalSize = const Size(1280, 900);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            continueWatchingProvider.overrideWith((ref) async => <ContinueWatchingItem>[]),
            moviesProvider.overrideWith((ref) async => const [
                  Movie(
                    id: 1,
                    title: 'Inception',
                    year: 2010,
                    monitored: true,
                  ),
                  Movie(
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

      // First tile autofocuses; select it to push the detail.
      await tester.sendKeyEvent(LogicalKeyboardKey.select);
      await tester.pumpAndSettle();
      expect(find.text('Inception'), findsWidgets);

      // The detail screen has its own Back control rather than an AppBar.
      Navigator.of(tester.element(find.byType(Scaffold).last)).pop();
      await tester.pumpAndSettle();

      expect(
        FocusManager.instance.primaryFocus?.debugLabel,
        'MoviesScreen.movie.1',
        reason: 'Back from the detail must return focus to the poster that opened it.',
      );
    });
  });
}
