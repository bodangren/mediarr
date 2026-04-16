import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/core/theme/mediarr_theme.dart';
import 'package:mediarr_client/core/widgets/leanback_scaffold.dart';
import 'package:mediarr_client/core/router/app_router.dart';

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

  group('LeanbackScaffold', () {
    testWidgets('renders NavigationRail with destinations', (tester) async {
      await tester.pumpWidget(buildTestApp(currentPath: AppRoutes.movies));

      expect(find.byType(NavigationRail), findsOneWidget);
      expect(find.text('Movies'), findsOneWidget);
      expect(find.text('Series'), findsOneWidget);
      expect(find.text('Settings'), findsOneWidget);
    });

    testWidgets('renders Mediarr branding in leading', (tester) async {
      await tester.pumpWidget(buildTestApp(currentPath: AppRoutes.movies));

      expect(find.text('Mediarr'), findsOneWidget);
      expect(find.byIcon(Icons.play_circle_fill), findsOneWidget);
    });

    testWidgets('renders child content', (tester) async {
      await tester.pumpWidget(
        buildTestApp(
          currentPath: AppRoutes.movies,
          child: const Text('Movie Grid'),
        ),
      );

      expect(find.text('Movie Grid'), findsOneWidget);
    });

    testWidgets('highlights Movies when on /movies path', (tester) async {
      await tester.pumpWidget(buildTestApp(currentPath: AppRoutes.movies));

      final rail = tester.widget<NavigationRail>(find.byType(NavigationRail));
      expect(rail.selectedIndex, 1);
    });

    testWidgets('highlights Series when on /series path', (tester) async {
      await tester.pumpWidget(buildTestApp(currentPath: AppRoutes.series));

      final rail = tester.widget<NavigationRail>(find.byType(NavigationRail));
      expect(rail.selectedIndex, 2);
    });

    testWidgets('highlights Settings when on /settings path', (tester) async {
      await tester.pumpWidget(buildTestApp(currentPath: AppRoutes.settings));

      final rail = tester.widget<NavigationRail>(find.byType(NavigationRail));
      expect(rail.selectedIndex, 3);
    });

    testWidgets('defaults to index 0 for unknown path', (tester) async {
      await tester.pumpWidget(buildTestApp(currentPath: '/unknown'));

      final rail = tester.widget<NavigationRail>(find.byType(NavigationRail));
      expect(rail.selectedIndex, 0);
    });

    testWidgets('renders vertical divider between rail and content',
        (tester) async {
      await tester.pumpWidget(buildTestApp(currentPath: AppRoutes.movies));

      expect(find.byType(VerticalDivider), findsOneWidget);
    });
  });
}
