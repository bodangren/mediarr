import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/core/router/app_router.dart';

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
      // Use pump() — discovery screen has an animating CircularProgressIndicator
      // so pumpAndSettle() would time out
      await tester.pump();
      await tester.pump();

      expect(find.text('Mediarr'), findsOneWidget);
      // Discovery screen shows manual entry mode when provider isn't overridden
      expect(find.text('Enter server address to connect'), findsOneWidget);
    });

    testWidgets('navigates to movies screen via shell route', (tester) async {
      final container = ProviderContainer();
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

      expect(find.text('Movies Library'), findsOneWidget);
      expect(find.text('Movies'), findsOneWidget);
    });

    testWidgets('navigates to series screen via shell route', (tester) async {
      final container = ProviderContainer();
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

      expect(find.text('Series Library'), findsOneWidget);
      expect(find.text('Series'), findsOneWidget);
    });

    testWidgets('navigates to settings screen via shell route', (tester) async {
      final container = ProviderContainer();
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
