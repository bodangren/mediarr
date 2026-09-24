import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/core/theme/mediarr_theme.dart';
import 'package:mediarr_client/core/widgets/leanback_scaffold.dart';
import 'package:mediarr_client/core/router/app_router.dart';

/// Rail contract (owner mockup 2026-09-24, FR-1): exactly five destinations
/// in mockup order — Home, Movies, Series, Search, Settings. The `Mediarr`
/// branding block and the `Server` affordance left the rail: "Change server"
/// lives on Settings.
///
/// The rail is a custom stack of focusable destinations. We assert the labels
/// render, the highlight state via label weight (a selected rail item renders
/// bold; an unselected item does not), and the destination set.
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

  group('LeanbackScaffold (mockup rail: Home/Movies/Series/Search/Settings)',
      () {
    testWidgets('renders exactly 5 rail destinations in mockup order',
        (tester) async {
      setLargeViewport(tester);
      await tester.pumpWidget(buildTestApp(currentPath: AppRoutes.movies));

      expect(find.text('Home'), findsOneWidget);
      expect(find.text('Movies'), findsOneWidget);
      expect(find.text('Series'), findsOneWidget);
      expect(find.text('Search'), findsOneWidget);
      expect(find.text('Settings'), findsOneWidget);

      // Exactly five rail tiles, in mockup order.
      final labels = tester
          .widgetList<Text>(find.byType(Text))
          .map((t) => t.data)
          .where((d) =>
              d == 'Home' ||
              d == 'Movies' ||
              d == 'Series' ||
              d == 'Search' ||
              d == 'Settings')
          .toList();
      expect(labels, ['Home', 'Movies', 'Series', 'Search', 'Settings']);
    });

    testWidgets('does NOT render the removed destinations or affordances',
        (tester) async {
      setLargeViewport(tester);
      await tester.pumpWidget(buildTestApp(currentPath: AppRoutes.movies));

      expect(find.text('Library'), findsNothing);
      expect(find.text('Activity'), findsNothing);
      expect(find.text('Calendar'), findsNothing);
      // FR-1: branding and the `Server` affordance left the rail.
      expect(find.text('Mediarr'), findsNothing);
      expect(find.text('Server'), findsNothing);
      expect(find.byIcon(Icons.play_circle_fill), findsNothing);
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

    testWidgets('marks Home as the active destination on /home', (tester) async {
      setLargeViewport(tester);
      await tester.pumpWidget(buildTestApp(currentPath: AppRoutes.home));

      final homeLabel = tester.widget<Text>(find.text('Home'));
      expect(homeLabel.style?.fontWeight, FontWeight.w700,
          reason: 'Active rail item must render in bold accent color.');
    });

    testWidgets('marks Movies as the active destination on /movies',
        (tester) async {
      setLargeViewport(tester);
      await tester.pumpWidget(buildTestApp(currentPath: AppRoutes.movies));

      final moviesLabel = tester.widget<Text>(find.text('Movies'));
      expect(moviesLabel.style?.fontWeight, FontWeight.w700);
    });

    testWidgets('marks Series as the active destination on /series',
        (tester) async {
      setLargeViewport(tester);
      await tester.pumpWidget(buildTestApp(currentPath: AppRoutes.series));

      final seriesLabel = tester.widget<Text>(find.text('Series'));
      expect(seriesLabel.style?.fontWeight, FontWeight.w700);
    });

    testWidgets('non-active rail items render with muted color', (tester) async {
      setLargeViewport(tester);
      await tester.pumpWidget(buildTestApp(currentPath: AppRoutes.home));

      final moviesLabel = tester.widget<Text>(find.text('Movies'));
      expect(moviesLabel.style?.fontWeight, isNot(FontWeight.w700),
          reason: 'Non-active rail items must not be bold.');
    });

    testWidgets('vertical divider separates rail from content', (tester) async {
      setLargeViewport(tester);
      await tester.pumpWidget(buildTestApp(currentPath: AppRoutes.movies));

      expect(find.byType(VerticalDivider), findsOneWidget);
    });
  });
}
