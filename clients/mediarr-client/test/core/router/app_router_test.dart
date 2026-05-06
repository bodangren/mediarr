import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/core/router/app_router.dart';
import 'package:mediarr_client/features/discovery/discovery_service.dart';
import 'package:mediarr_client/features/calendar/calendar_screen.dart';
import 'package:mediarr_client/features/library/continue_watching_section.dart';
import 'package:mediarr_client/features/library/movies_screen.dart';
import 'package:mediarr_client/features/library/series_screen.dart';
import 'package:mediarr_client/shared/models/movie.dart';
import 'package:mediarr_client/shared/models/series.dart';

class _RouterTestDiscoveryService extends DiscoveryService {
  _RouterTestDiscoveryService()
    : super(mdnsAdapter: NoOpMdnsAdapter(), scanTimeoutDuration: Duration.zero);

  @override
  Future<void> startScan() async {
    state = const DiscoveryState(phase: DiscoveryPhase.idle);
  }

  @override
  Future<void> stopScan() async {}
}

void main() {
  void setLargeViewport(WidgetTester tester) {
    tester.view.physicalSize = const Size(800, 900);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
  }

  group('AppRoutes', () {
    test('defines expected route paths', () {
      expect(AppRoutes.discovery, '/discovery');
      expect(AppRoutes.home, '/home');
      expect(AppRoutes.movies, '/movies');
      expect(AppRoutes.series, '/series');
      expect(AppRoutes.calendar, '/calendar');
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

    test('initial location is home', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      final router = container.read(appRouterProvider);
      expect(
        router.routeInformationProvider.value.uri.path,
        AppRoutes.home,
      );
    });
  });

  group('Router navigation', () {
    ProviderContainer createRouterTestContainer({
      List<Override> overrides = const [],
    }) {
      return ProviderContainer(
        overrides: [
          discoveryServiceProvider.overrideWith(
            (ref) => _RouterTestDiscoveryService(),
          ),
          continueWatchingProvider.overrideWith((ref) async => const []),
          calendarProvider.overrideWith((ref, params) async => {}),
          ...overrides,
        ],
      );
    }

    testWidgets('home screen renders at initial route', (tester) async {
      setLargeViewport(tester);
      final container = createRouterTestContainer();
      addTearDown(container.dispose);

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: MaterialApp.router(
            routerConfig: container.read(appRouterProvider),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Home'), findsWidgets);
      expect(find.text('Upcoming'), findsOneWidget);
    });

    testWidgets('navigates to calendar screen via shell route', (tester) async {
      setLargeViewport(tester);
      final container = createRouterTestContainer();
      addTearDown(container.dispose);

      final router = container.read(appRouterProvider);

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: MaterialApp.router(routerConfig: router),
        ),
      );
      await tester.pump();

      router.go(AppRoutes.calendar);
      await tester.pumpAndSettle();

      expect(find.text('Calendar'), findsWidgets);
    });

    testWidgets('navigates to movies screen via shell route', (tester) async {
      setLargeViewport(tester);
      final container = createRouterTestContainer(
        overrides: [moviesProvider.overrideWith((ref) async => <Movie>[])],
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
      setLargeViewport(tester);
      final container = createRouterTestContainer(
        overrides: [seriesListProvider.overrideWith((ref) async => <Series>[])],
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
      setLargeViewport(tester);
      final container = createRouterTestContainer(
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
