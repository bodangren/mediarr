import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/core/theme/mediarr_theme.dart';
import 'package:mediarr_client/features/search/search_screen.dart';
import 'package:mediarr_client/shared/models/movie.dart';
import 'package:mediarr_client/shared/models/series.dart';
import 'package:mediarr_client/shared/services/api_client.dart';

import '../../support/fakes/fake_api_client.dart';

void main() {
  testWidgets('search shows a hint, filters by type and reports no matches',
      (tester) async {
    tester.view.physicalSize = const Size(1280, 720);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final api = FakeMediarrApiClient()
      ..moviesReturn = const [Movie(id: 1, title: 'Alien')]
      ..seriesReturn = const [Series(id: 2, title: 'Altered Carbon', monitored: true)];

    await tester.pumpWidget(
      ProviderScope(
        overrides: [apiClientProvider.overrideWith((ref) => api)],
        child: MaterialApp(theme: mediarrDarkTheme, home: const SearchScreen()),
      ),
    );
    await tester.pump();
    await tester.pump();

    expect(find.textContaining('Type to search'), findsOneWidget);

    await tester.enterText(find.byType(TextField), 'al');
    await tester.pump();

    expect(find.textContaining('All · 2'), findsOneWidget);
    expect(find.textContaining('Movies · 1'), findsOneWidget);
    expect(find.textContaining('Series · 1'), findsOneWidget);

    await tester.enterText(find.byType(TextField), 'zzz');
    await tester.pump();
    expect(find.textContaining('No matches for "zzz"'), findsOneWidget);
  });
}
