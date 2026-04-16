import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/core/theme/mediarr_theme.dart';
import 'package:mediarr_client/features/search/search_screen.dart';
import 'package:mediarr_client/shared/models/search_result.dart';
import 'package:mediarr_client/shared/services/api_client.dart';

void main() {
  group('SearchScreen', () {
    testWidgets('shows search bar and hint text', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            searchResultsProvider.overrideWith((ref) async => <SearchResult>[]),
          ],
          child: MaterialApp(
            theme: mediarrDarkTheme,
            home: const Scaffold(body: SearchScreen()),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Search'), findsOneWidget);
      expect(find.byType(TextField), findsOneWidget);
      expect(find.text('Enter a search term to find movies and series'),
          findsOneWidget);
    });

    testWidgets('shows initial state without query', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            theme: mediarrDarkTheme,
            home: const Scaffold(body: SearchScreen()),
          ),
        ),
      );

      expect(find.text('Search'), findsOneWidget);
      expect(find.byIcon(Icons.search), findsWidgets);
    });

    testWidgets('shows loading indicator after search', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            searchQueryProvider.overrideWith((ref) => 'inception'),
            searchResultsProvider.overrideWith((ref) async {
              await Completer<void>().future;
              return <SearchResult>[];
            }),
          ],
          child: MaterialApp(
            theme: mediarrDarkTheme,
            home: const Scaffold(body: SearchScreen()),
          ),
        ),
      );

      await tester.pump();
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('shows search results when loaded', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            searchQueryProvider.overrideWith((ref) => 'inception'),
            searchResultsProvider.overrideWith((ref) async => [
                  const SearchResult(
                    tmdbId: 27205,
                    tvdbId: 0,
                    title: 'Inception',
                    year: 2010,
                    overview: 'A thief who steals corporate secrets...',
                    posterUrl: null,
                    mediaType: 'movie',
                  ),
                  const SearchResult(
                    tmdbId: 577922,
                    tvdbId: 0,
                    title: 'Inception',
                    year: 2015,
                    overview: 'TV series...',
                    posterUrl: null,
                    mediaType: 'series',
                  ),
                ]),
          ],
          child: MaterialApp(
            theme: mediarrDarkTheme,
            home: const Scaffold(body: SearchScreen()),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Inception'), findsWidgets);
    });

    testWidgets('shows empty state when no results', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            searchQueryProvider.overrideWith((ref) => 'xyznonexistent123'),
            searchResultsProvider.overrideWith((ref) async => <SearchResult>[]),
          ],
          child: MaterialApp(
            theme: mediarrDarkTheme,
            home: const Scaffold(body: SearchScreen()),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.textContaining('No results'), findsOneWidget);
    });

    testWidgets('shows error state on failure', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            searchQueryProvider.overrideWith((ref) => 'test'),
            searchResultsProvider.overrideWith((ref) async {
              throw Exception('Network error');
            }),
          ],
          child: MaterialApp(
            theme: mediarrDarkTheme,
            home: const Scaffold(body: SearchScreen()),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.textContaining('Search failed'), findsOneWidget);
    });

    testWidgets('shows MOVIE badge for movie results', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            searchQueryProvider.overrideWith((ref) => 'inception'),
            searchResultsProvider.overrideWith((ref) async => [
              const SearchResult(
                tmdbId: 27205,
                tvdbId: 0,
                title: 'Inception',
                year: 2010,
                mediaType: 'movie',
              ),
            ]),
          ],
          child: MaterialApp(
            theme: mediarrDarkTheme,
            home: const Scaffold(body: SearchScreen()),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('MOVIE'), findsOneWidget);
    });

    testWidgets('shows SERIES badge for series results', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            searchQueryProvider.overrideWith((ref) => 'inception'),
            searchResultsProvider.overrideWith((ref) async => [
              const SearchResult(
                tmdbId: 0,
                tvdbId: 12345,
                title: 'Inception',
                year: 2015,
                mediaType: 'series',
              ),
            ]),
          ],
          child: MaterialApp(
            theme: mediarrDarkTheme,
            home: const Scaffold(body: SearchScreen()),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('SERIES'), findsOneWidget);
    });
  });
}