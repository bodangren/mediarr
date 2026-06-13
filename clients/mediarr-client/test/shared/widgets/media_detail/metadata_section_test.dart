import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/core/theme/mediarr_theme.dart';
import 'package:mediarr_client/shared/widgets/media_detail/metadata_section.dart';

/// Widget tests for `MetadataSection` — feature-agnostic metadata block used
/// by both `MovieDetailScreen` and `SeriesDetailScreen`.
///
/// Per `test-strategy.md` §4 guardrail #3: no model imports. Accepts
/// primitives (synopsis, genres, cast, rating, year, runtime, network) and
/// only renders the fields that are non-null/non-empty.
void main() {
  Widget buildTestApp({required Widget child}) {
    return MaterialApp(
      theme: mediarrDarkTheme,
      home: Scaffold(body: child),
    );
  }

  group('MetadataSection', () {
    testWidgets('renders synopsis paragraph when provided', (tester) async {
      await tester.pumpWidget(buildTestApp(
        child: const SingleChildScrollView(
          child: MetadataSection(
            synopsis: 'A thief who steals corporate secrets...',
          ),
        ),
      ));

      expect(
        find.text('A thief who steals corporate secrets...'),
        findsOneWidget,
      );
    });

    testWidgets('omits synopsis block when synopsis is null', (tester) async {
      await tester.pumpWidget(buildTestApp(
        child: const SingleChildScrollView(
          child: MetadataSection(
            genres: ['Sci-Fi'],
          ),
        ),
      ));

      // No paragraph with synopsis text should be rendered.
      expect(find.text('A thief who...'), findsNothing);
      // Genres section is still present.
      expect(find.text('Sci-Fi'), findsOneWidget);
    });

    testWidgets('renders a chip per genre', (tester) async {
      await tester.pumpWidget(buildTestApp(
        child: const SingleChildScrollView(
          child: MetadataSection(
            genres: ['Action', 'Sci-Fi', 'Thriller'],
          ),
        ),
      ));

      expect(find.text('Action'), findsOneWidget);
      expect(find.text('Sci-Fi'), findsOneWidget);
      expect(find.text('Thriller'), findsOneWidget);
    });

    testWidgets('renders a chip per cast member', (tester) async {
      await tester.pumpWidget(buildTestApp(
        child: const SingleChildScrollView(
          child: MetadataSection(
            cast: ['Leonardo DiCaprio', 'Joseph Gordon-Levitt'],
          ),
        ),
      ));

      expect(find.text('Leonardo DiCaprio'), findsOneWidget);
      expect(find.text('Joseph Gordon-Levitt'), findsOneWidget);
    });

    testWidgets('renders rating when provided', (tester) async {
      await tester.pumpWidget(buildTestApp(
        child: const SingleChildScrollView(
          child: MetadataSection(rating: '8.8'),
        ),
      ));

      expect(find.text('8.8'), findsOneWidget);
    });

    testWidgets('renders year and runtime row when both provided', (tester) async {
      await tester.pumpWidget(buildTestApp(
        child: const SingleChildScrollView(
          child: MetadataSection(
            year: 2010,
            runtime: 148,
          ),
        ),
      ));

      expect(find.text('2010'), findsOneWidget);
      expect(find.textContaining('148'), findsOneWidget);
    });

    testWidgets('renders network for series when provided', (tester) async {
      await tester.pumpWidget(buildTestApp(
        child: const SingleChildScrollView(
          child: MetadataSection(
            network: 'AMC',
            year: 2008,
          ),
        ),
      ));

      expect(find.text('AMC'), findsOneWidget);
      expect(find.text('2008'), findsOneWidget);
    });

    testWidgets('renders nothing when all fields are null and lists are empty',
        (tester) async {
      await tester.pumpWidget(buildTestApp(
        child: const SingleChildScrollView(
          child: MetadataSection(),
        ),
      ));

      // No crash, no text content. The widget should still be in the tree
      // (so the parent layout doesn't shift).
      expect(find.byType(MetadataSection), findsOneWidget);
    });
  });
}
