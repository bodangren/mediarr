import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/core/theme/mediarr_theme.dart';
import 'package:mediarr_client/shared/widgets/media_grid.dart';

void main() {
  Widget buildTestApp({required Widget child}) {
    return MaterialApp(theme: mediarrDarkTheme, home: Scaffold(body: child));
  }

  group('MediaGrid', () {
    testWidgets('renders title', (tester) async {
      await tester.pumpWidget(buildTestApp(
        child: MediaGrid(
          title: 'Movies',
          itemCount: 0,
          itemBuilder: (_, __) => const SizedBox(),
          isEmpty: true,
        ),
      ));

      expect(find.text('Movies'), findsOneWidget);
    });

    testWidgets('shows loading indicator when isLoading', (tester) async {
      await tester.pumpWidget(buildTestApp(
        child: MediaGrid(
          title: 'Movies',
          itemCount: 0,
          itemBuilder: (_, __) => const SizedBox(),
          isLoading: true,
        ),
      ));

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('shows empty message when isEmpty', (tester) async {
      await tester.pumpWidget(buildTestApp(
        child: MediaGrid(
          title: 'Movies',
          itemCount: 0,
          itemBuilder: (_, __) => const SizedBox(),
          isEmpty: true,
          emptyMessage: 'No movies found',
        ),
      ));

      expect(find.text('No movies found'), findsOneWidget);
      expect(find.byIcon(Icons.inbox), findsOneWidget);
    });

    testWidgets('renders grid items', (tester) async {
      await tester.pumpWidget(buildTestApp(
        child: MediaGrid(
          title: 'Movies',
          itemCount: 3,
          itemBuilder: (_, index) => Text('Item $index'),
        ),
      ));

      expect(find.text('Item 0'), findsOneWidget);
      expect(find.text('Item 1'), findsOneWidget);
      expect(find.text('Item 2'), findsOneWidget);
    });

    testWidgets('renders search bar when controller provided', (tester) async {
      final controller = TextEditingController();
      await tester.pumpWidget(buildTestApp(
        child: MediaGrid(
          title: 'Movies',
          itemCount: 0,
          itemBuilder: (_, __) => const SizedBox(),
          searchController: controller,
          isEmpty: true,
        ),
      ));

      expect(find.byType(TextField), findsOneWidget);
      expect(find.byIcon(Icons.search), findsOneWidget);

      controller.dispose();
    });
  });
}
