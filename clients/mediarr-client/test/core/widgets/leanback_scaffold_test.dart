import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/core/theme/mediarr_theme.dart';
import 'package:mediarr_client/core/widgets/leanback_scaffold.dart';
import 'package:mediarr_client/core/router/app_router.dart';

/// Phase 4b: LeanbackScaffold sidebar carries ONLY Home / Movies / Series.
/// Activity / Calendar / Search / Settings routes 404 in slim mode and are
/// removed from the TV UI.
///
/// Phase 4b+ follow-up: the sidebar is now a custom stack of focusable
/// destinations, NOT a Material NavigationRail. We assert the destinations
/// render + each labels' icon/text + the highlight state via label
/// color/boldness (a selected rail item is rendered with the accent
/// color and bold weight; an unselected item is muted gray).
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
    testWidgets('renders exactly 3 rail destinations', (tester) async {
      setLargeViewport(tester);
      await tester.pumpWidget(buildTestApp(currentPath: AppRoutes.movies));

      expect(find.text('Home'), findsOneWidget);
      expect(find.text('Movies'), findsOneWidget);
      expect(find.text('Series'), findsOneWidget);
    });

    testWidgets('does NOT render the slim-disabled destinations',
        (tester) async {
      setLargeViewport(tester);
      await tester.pumpWidget(buildTestApp(currentPath: AppRoutes.movies));

      expect(find.text('Library'), findsNothing);
      expect(find.text('Activity'), findsNothing);
      expect(find.text('Search'), findsNothing);
      expect(find.text('Calendar'), findsNothing);
      expect(find.text('Settings'), findsNothing);
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

    testWidgets('marks Home as the active destination on /home',
        (tester) async {
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

    testWidgets('vertical divider separates rail from content',
        (tester) async {
      setLargeViewport(tester);
      await tester.pumpWidget(buildTestApp(currentPath: AppRoutes.movies));

      expect(find.byType(VerticalDivider), findsOneWidget);
    });
  });
}