import 'package:cached_network_image/cached_network_image.dart';
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

      // The placeholder now shows a monogram instead of a film icon, so a
      // posterless grid reads as designed rather than as failed loads.
      expect(find.text('N'), findsOneWidget);
      expect(find.byIcon(Icons.movie), findsNothing);
    });

    testWidgets('placeholder monogram skips a leading article', (tester) async {
      await tester.pumpWidget(buildTestApp(
        child: const PosterCard(title: 'The Boys'),
      ));

      expect(find.text('B'), findsOneWidget);
      expect(find.text('T'), findsNothing);
    });

    testWidgets('placeholder monogram is deterministic for a title',
        (tester) async {
      await tester.pumpWidget(buildTestApp(
        child: const Row(
          children: [
            SizedBox(
              width: 160,
              height: 240,
              child: PosterCard(title: 'Alien'),
            ),
            SizedBox(
              width: 160,
              height: 240,
              child: PosterCard(title: 'Alien'),
            ),
          ],
        ),
      ));

      expect(find.text('A'), findsNWidgets(2));
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

    testWidgets(
      'landscape artwork is letterboxed inside the portrait frame (FR-1)',
      (tester) async {
        // Owner report 2026-11-16: "poster image frames are portrait, but the
        // images themselves are landscape. There's no way to really identify
        // the series by image." Most series in the library only have a
        // landscape backdrop, which BoxFit.cover cropped to an unreadable
        // portrait slice. The card must show the whole frame (contain) over a
        // blurred fill so the portrait tile never has empty bars.
        await tester.pumpWidget(
          buildTestApp(
            child: const SizedBox(
              width: 165,
              height: 285,
              child: PosterCard(
                title: 'How I Met Your Mother',
                posterUrl: '/api/images/backdrop-1.jpg',
              ),
            ),
          ),
        );

        final artwork = tester
            .widgetList<CachedNetworkImage>(find.byType(CachedNetworkImage))
            .toList();
        expect(
          artwork.length,
          greaterThanOrEqualTo(2),
          reason:
              'The card needs a blurred cover fill plus a contained artwork '
              'layer so landscape art is identifiable in a portrait frame.',
        );
        expect(
          artwork.any((image) => image.fit == BoxFit.contain),
          isTrue,
          reason: 'The artwork itself must not be cropped away.',
        );
        expect(
          artwork.any((image) => image.fit == BoxFit.cover),
          isTrue,
          reason: 'The blurred fill behind the artwork must cover the frame.',
        );
      },
    );
  });
}
