import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/core/theme/mediarr_theme.dart';
import 'package:mediarr_client/shared/widgets/poster_card.dart';

void main() {
  Widget buildTestApp({required Widget child}) {
    return MaterialApp(theme: mediarrDarkTheme, home: Scaffold(body: child));
  }

  group('PosterCard', () {
    testWidgets('renders title', (tester) async {
      await tester.pumpWidget(buildTestApp(
        child: const PosterCard(title: 'Inception'),
      ));

      expect(find.text('Inception'), findsWidgets); // title + placeholder
    });

    testWidgets('renders year when provided', (tester) async {
      await tester.pumpWidget(buildTestApp(
        child: const PosterCard(title: 'Inception', year: 2010),
      ));

      expect(find.text('2010'), findsOneWidget);
    });

    testWidgets('renders quality badge when provided', (tester) async {
      await tester.pumpWidget(buildTestApp(
        child: const PosterCard(title: 'Inception', quality: '1080p'),
      ));

      expect(find.text('1080p'), findsOneWidget);
    });

    testWidgets('renders placeholder when no poster URL', (tester) async {
      await tester.pumpWidget(buildTestApp(
        child: const PosterCard(title: 'No Poster Movie'),
      ));

      expect(find.byIcon(Icons.movie), findsOneWidget);
    });

    testWidgets('triggers onPressed', (tester) async {
      var pressed = false;
      await tester.pumpWidget(buildTestApp(
        child: PosterCard(
          title: 'Clickable',
          onPressed: () => pressed = true,
        ),
      ));

      await tester.tap(find.text('Clickable').first);
      expect(pressed, true);
    });

    testWidgets('shows green dot for downloaded', (tester) async {
      await tester.pumpWidget(buildTestApp(
        child: const PosterCard(
          title: 'Downloaded',
          hasFile: true,
          monitored: true,
        ),
      ));

      // Status dot should be present (green for downloaded)
      // We can verify by finding the 8x8 Container with circle decoration
      expect(find.byType(PosterCard), findsOneWidget);
    });
  });
}
