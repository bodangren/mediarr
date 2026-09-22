import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/core/theme/mediarr_theme.dart';
import 'package:mediarr_client/core/widgets/leanback_scaffold.dart';
import 'package:mediarr_client/core/router/app_router.dart';

/// Phase 4b: LeanbackScaffold sidebar carries ONLY Home / Movies / Series.
/// Activity / Calendar / Search / Settings routes 404 in slim mode and are
/// removed from the TV UI.
void main() {
  Widget buildTestApp({
    required String currentPath,
    Widget child = const Text('Content'),
  }) {
    return MaterialApp(
      theme: mediarrDarkTheme,
      home: LeanbackScaffold(
        currentPath: currentPath,
        child: child,
      ),
    );
  }

  void setLargeViewport(WidgetTester tester) {
    tester.view.physicalSize = const Size(800, 900);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
  }

  group('LeanbackScaffold (Phase 4b: Home/Movies/Series only)', () {
    testWidgets('renders NavigationRail with exactly 3 destinations',
        (tester) async {
      setLargeViewport(tester);
      await tester.pumpWidget(buildTestApp(currentPath: AppRoutes.movies));

      expect(find.byType(NavigationRail), findsOneWidget);
      expect(find.text('Home'), findsOneWidget);
      expect(find.text('Movies'), findsOneWidget);
      expect(find.text('Series'), findsOneWidget);
    });

    testWidgets('does NOT render the slim-disabled destinations',
        (tester) async {
      setLargeViewport(tester);
      await tester.pumpWidget(buildTestApp(currentPath: AppRoutes.movies));

      expect(find.text('Library'), findsNothing,
          reason: 'Library route is gone (Phase 4b slim UI).');
      expect(find.text('Activity'), findsNothing,
          reason: 'Activity route is gone (Phase 4b slim UI).');
      expect(find.text('Search'), findsNothing,
          reason: 'Search route is gone (Phase 4b slim UI).');
      expect(find.text('Calendar'), findsNothing,
          reason: 'Calendar route is gone (Phase 4b slim UI).');
      expect(find.text('Settings'), findsNothing,
          reason: 'Settings route is gone (Phase 4b slim UI).');
    });

    testWidgets('renders Mediarr branding in leading', (tester) async {
      setLargeViewport(tester);
      await tester.pumpWidget(buildTestApp(currentPath: AppRoutes.movies));

      expect(find.text('Mediarr'), findsOneWidget);
      expect(find.byIcon(Icons.play_circle_fill), findsOneWidget);
    });

    testWidgets('renders child content', (tester) async {
      setLargeViewport(tester);
      await tester.pumpWidget(
        buildTestApp(
          currentPath: AppRoutes.movies,
          child: const Text('Movie Grid'),
        ),
      );

      expect(find.text('Movie Grid'), findsOneWidget);
    });

    testWidgets('highlights Home when on /home path', (tester) async {
      setLargeViewport(tester);
      await tester.pumpWidget(buildTestApp(currentPath: AppRoutes.home));

      final rail = tester.widget<NavigationRail>(find.byType(NavigationRail));
      expect(rail.selectedIndex, 0);
    });

    testWidgets('highlights Movies when on /movies path', (tester) async {
      setLargeViewport(tester);
      await tester.pumpWidget(buildTestApp(currentPath: AppRoutes.movies));

      final rail = tester.widget<NavigationRail>(find.byType(NavigationRail));
      expect(rail.selectedIndex, 1);
    });

    testWidgets('highlights Series when on /series path', (tester) async {
      setLargeViewport(tester);
      await tester.pumpWidget(buildTestApp(currentPath: AppRoutes.series));

      final rail = tester.widget<NavigationRail>(find.byType(NavigationRail));
      expect(rail.selectedIndex, 2);
    });

    testWidgets('defaults to index 0 for unknown path', (tester) async {
      setLargeViewport(tester);
      await tester.pumpWidget(buildTestApp(currentPath: '/unknown'));

      final rail = tester.widget<NavigationRail>(find.byType(NavigationRail));
      expect(rail.selectedIndex, 0);
    });

    testWidgets('renders vertical divider between rail and content',
        (tester) async {
      setLargeViewport(tester);
      await tester.pumpWidget(buildTestApp(currentPath: AppRoutes.movies));

      expect(find.byType(VerticalDivider), findsOneWidget);
    });
  });
}
