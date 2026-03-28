import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/core/router/app_router.dart';
import 'package:mediarr_client/features/library/movies_screen.dart';
import 'package:mediarr_client/features/library/series_screen.dart';
import 'package:mediarr_client/shared/models/movie.dart';
import 'package:mediarr_client/shared/models/series.dart';

void main() {
  group('AppRoutes', () {
    test('defines expected route paths', () {
      expect(AppRoutes.discovery, '/discovery');
      expect(AppRoutes.movies, '/movies');
      expect(AppRoutes.series, '/series');
      expect(AppRoutes.settings, '/settings');
    });
  });

  group('appRouterProvider', () {
    test('provides a GoRouter instance', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      final router = container.read(appRouterProvider);
      expect(router, isNotNull);
    });

    test('initial location is discovery', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      final router = container.read(appRouterProvider);
      expect(
        router.routeInformationProvider.value.uri.path,
        AppRoutes.discovery,
      );
    });
  });

  group('Router navigation', () {
    testWidgets('discovery screen renders at initial route', (tester) async {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: MaterialApp.router(
            routerConfig: container.read(appRouterProvider),
          ),
        ),
      );
      await tester.pump();
      await tester.pump();

      expect(find.text('Mediarr'), findsOneWidget);
      expect(find.text('Enter server address to connect'), findsOneWidget);
    });

    testWidgets('navigates to movies screen via shell route', (tester) async {
      final container = ProviderContainer(
        overrides: [
          moviesProvider.overrideWith((ref) async => <Movie>[]),
        ],
      );
      addTearDown(container.dispose);

      final router = container.read(appRouterProvider);

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: MaterialApp.router(routerConfig: router),
        ),
      );
      await tester.pump();

      router.go(AppRoutes.movies);
      await tester.pumpAndSettle();

      // MediaGrid title is "Movies"; NavigationRail label is also "Movies"
      expect(find.text('Movies'), findsWidgets);
    });

    testWidgets('navigates to series screen via shell route', (tester) async {
      final container = ProviderContainer(
        overrides: [
          seriesListProvider.overrideWith((ref) async => <Series>[]),
        ],
      );
      addTearDown(container.dispose);

      final router = container.read(appRouterProvider);

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: MaterialApp.router(routerConfig: router),
        ),
      );
      await tester.pump();

      router.go(AppRoutes.series);
      await tester.pumpAndSettle();

      expect(find.text('Series'), findsWidgets);
    });

    testWidgets('navigates to settings screen via shell route', (tester) async {
      final container = ProviderContainer(
        overrides: [
          moviesProvider.overrideWith((ref) async => <Movie>[]),
          seriesListProvider.overrideWith((ref) async => <Series>[]),
        ],
      );
      addTearDown(container.dispose);

      final router = container.read(appRouterProvider);

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: MaterialApp.router(routerConfig: router),
        ),
      );
      await tester.pump();

      router.go(AppRoutes.settings);
      await tester.pumpAndSettle();

      expect(find.text('Settings'), findsWidgets);
    });
  });
}
