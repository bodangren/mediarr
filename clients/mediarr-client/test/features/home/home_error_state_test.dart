import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/core/theme/mediarr_theme.dart';
import 'package:mediarr_client/features/home/home_screen.dart';
import 'package:mediarr_client/features/library/continue_watching_section.dart';
import 'package:mediarr_client/shared/services/api_client.dart';

void main() {
  testWidgets('home shows a retryable error row and a visible Search action',
      (tester) async {
    tester.view.physicalSize = const Size(1280, 720);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          continueWatchingProvider.overrideWith((ref) async => <ContinueWatchingItem>[]),
          recentlyAddedProvider.overrideWith((ref) async => throw Exception('boom')),
          homeMoviesProvider.overrideWith((ref) async => const []),
          homeSeriesProvider.overrideWith((ref) async => const []),
        ],
        child: MaterialApp(theme: mediarrDarkTheme, home: const HomeScreen()),
      ),
    );
    await tester.pump();
    await tester.pump();

    expect(find.text('Some home rows failed to load.'), findsOneWidget);
    expect(find.text('Retry'), findsOneWidget);
    expect(find.text('Search'), findsOneWidget,
        reason: 'Home must expose a Search action (Kimi home/search review).');
  });
}
