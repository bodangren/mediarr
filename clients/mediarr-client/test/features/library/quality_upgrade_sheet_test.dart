import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/features/library/quality_upgrade_sheet.dart';
import 'package:mediarr_client/shared/services/api_client.dart';

import '../../support/fakes/fake_api_client.dart';

void main() {
  group('QualityUpgradeSheet', () {
    late FakeMediarrApiClient fakeClient;

    setUp(() {
      fakeClient = FakeMediarrApiClient();
    });

    Widget buildSheet({
      String? query,
      String? currentQuality,
      VoidCallback? onGrabbed,
    }) {
      return ProviderScope(
        overrides: [
          apiClientProvider.overrideWith((ref) => fakeClient),
        ],
        child: MaterialApp(
          home: Scaffold(
            body: Builder(
              builder: (context) => ElevatedButton(
                onPressed: () {
                  showModalBottomSheet(
                    context: context,
                    builder: (_) => QualityUpgradeSheet(
                      query: query,
                      currentQuality: currentQuality,
                      onGrabbed: onGrabbed ?? () {},
                    ),
                  );
                },
                child: const Text('Show'),
              ),
            ),
          ),
        ),
      );
    }

    testWidgets('shows loading state initially', (tester) async {
      fakeClient.searchReleasesReturn = [];

      await tester.pumpWidget(buildSheet(query: 'Test Movie'));
      await tester.tap(find.text('Show'));
      await tester.pump();

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('shows search results with quality badges', (tester) async {
      fakeClient.searchReleasesReturn = [
        Release(
          guid: 'release-1',
          title: 'Test.Movie.2024.1080p.BluRay',
          quality: 'Bluray-1080p',
          indexerName: 'TestIndexer',
          indexerId: 1,
          size: 2147483648,
          seeders: 50,
          leechers: 10,
        ),
        Release(
          guid: 'release-2',
          title: 'Test.Movie.2024.2160p.UHD',
          quality: 'UHD-2160p',
          indexerName: 'TestIndexer',
          indexerId: 1,
          size: 5368709120,
          seeders: 25,
          leechers: 5,
        ),
      ];

      await tester.pumpWidget(buildSheet(
        query: 'Test Movie',
        currentQuality: 'Bluray-720p',
      ));
      await tester.tap(find.text('Show'));
      await tester.pumpAndSettle();

      expect(find.text('Test.Movie.2024.1080p.BluRay'), findsOneWidget);
      expect(find.text('Test.Movie.2024.2160p.UHD'), findsOneWidget);
      expect(find.text('Bluray-1080p'), findsOneWidget);
      expect(find.text('UHD-2160p'), findsOneWidget);
      expect(find.text('Current: Bluray-720p'), findsOneWidget);
    });

    testWidgets('shows empty state when no results', (tester) async {
      fakeClient.searchReleasesReturn = [];

      await tester.pumpWidget(buildSheet(query: 'Test Movie'));
      await tester.tap(find.text('Show'));
      await tester.pumpAndSettle();

      expect(find.text('No upgrade releases found'), findsOneWidget);
    });

    testWidgets('shows error state on failure', (tester) async {
      fakeClient.searchReleasesError = Exception('Search failed');

      await tester.pumpWidget(buildSheet(query: 'Test Movie'));
      await tester.tap(find.text('Show'));
      await tester.pumpAndSettle();

      expect(find.textContaining('Search failed'), findsOneWidget);
      expect(find.text('Retry'), findsOneWidget);
    });

    testWidgets('grab button triggers grabRelease', (tester) async {
      fakeClient.searchReleasesReturn = [
        Release(
          guid: 'release-1',
          title: 'Test.Movie.2024.1080p.BluRay',
          quality: 'Bluray-1080p',
          indexerName: 'TestIndexer',
          indexerId: 1,
          size: 2147483648,
        ),
      ];

      var grabbed = false;
      await tester.pumpWidget(buildSheet(
        query: 'Test Movie',
        onGrabbed: () => grabbed = true,
      ));
      await tester.tap(find.text('Show'));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Grab'));
      await tester.pumpAndSettle();

      expect(grabbed, true);
    });
  });
}
