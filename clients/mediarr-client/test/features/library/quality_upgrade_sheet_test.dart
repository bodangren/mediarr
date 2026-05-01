import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/features/library/quality_upgrade_sheet.dart';
import 'package:mediarr_client/shared/services/api_client.dart';

import '../../shared/services/api_client_test.dart';

void main() {
  group('QualityUpgradeSheet', () {
    late MockHttpAdapter adapter;
    late MediarrApiClient client;

    setUp(() {
      adapter = MockHttpAdapter();
      final dio = Dio();
      dio.httpClientAdapter = adapter;
      client = MediarrApiClient(dio: dio);
      client.connect('http://localhost:5174');
    });

    Widget buildSheet({
      String? query,
      String? currentQuality,
      VoidCallback? onGrabbed,
    }) {
      return ProviderScope(
        overrides: [
          apiClientProvider.overrideWith((ref) => client),
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
      adapter.onGet('/api/releases/search', data: {
        'ok': true,
        'data': [],
      });

      await tester.pumpWidget(buildSheet(query: 'Test Movie'));
      await tester.tap(find.text('Show'));
      await tester.pump();

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('shows search results with quality badges', (tester) async {
      adapter.onGet('/api/releases/search', data: {
        'ok': true,
        'data': {
          'items': [
            {
              'guid': 'release-1',
              'title': 'Test.Movie.2024.1080p.BluRay',
              'quality': 'Bluray-1080p',
              'indexer': 'TestIndexer',
              'indexerId': 1,
              'size': 2147483648,
              'seeders': 50,
              'leechers': 10,
            },
            {
              'guid': 'release-2',
              'title': 'Test.Movie.2024.2160p.UHD',
              'quality': 'UHD-2160p',
              'indexer': 'TestIndexer',
              'indexerId': 1,
              'size': 5368709120,
              'seeders': 25,
              'leechers': 5,
            }
          ]
        },
      });

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
      adapter.onGet('/api/releases/search', data: {
        'ok': true,
        'data': [],
      });

      await tester.pumpWidget(buildSheet(query: 'Test Movie'));
      await tester.tap(find.text('Show'));
      await tester.pumpAndSettle();

      expect(find.text('No upgrade releases found'), findsOneWidget);
    });

    testWidgets('shows error state on failure', (tester) async {
      adapter.onGet('/api/releases/search', data: {
        'error': 'Search failed',
      }, statusCode: 500);

      await tester.pumpWidget(buildSheet(query: 'Test Movie'));
      await tester.tap(find.text('Show'));
      await tester.pumpAndSettle();

      expect(find.text('Search failed'), findsOneWidget);
      expect(find.text('Retry'), findsOneWidget);
    });

    testWidgets('grab button triggers grabRelease', (tester) async {
      adapter.onGet('/api/releases/search', data: {
        'ok': true,
        'data': {
          'items': [
            {
              'guid': 'release-1',
              'title': 'Test.Movie.2024.1080p.BluRay',
              'quality': 'Bluray-1080p',
              'indexer': 'TestIndexer',
              'indexerId': 1,
              'size': 2147483648,
            }
          ]
        },
      });

      adapter.onGet('/api/releases/grab', data: {
        'ok': true,
        'data': {
          'infoHash': 'abc123',
          'name': 'Test.Movie.2024.1080p.BluRay',
        },
      });

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
