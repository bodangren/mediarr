import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/core/theme/mediarr_theme.dart';
import 'package:mediarr_client/features/library/continue_watching_section.dart';
import 'package:mediarr_client/features/library/movies_screen.dart';
import 'package:mediarr_client/shared/models/movie.dart';
import 'package:mediarr_client/shared/services/api_client.dart';

void main() {
  testWidgets('search text updates the server query after the debounce', (tester) async {
    tester.view.physicalSize = const Size(1280, 720);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final container = ProviderContainer(overrides: [
      continueWatchingProvider.overrideWith((ref) async => <ContinueWatchingItem>[]),
      moviesProvider.overrideWith((ref) async => const [Movie(id: 1, title: 'Inception')]),
    ]);
    addTearDown(container.dispose);

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: MaterialApp(theme: mediarrDarkTheme, home: const Scaffold(body: MoviesScreen())),
      ),
    );
    await tester.pump();
    await tester.pump();

    await tester.enterText(find.byType(TextField), 'alien');
    await tester.pump(const Duration(milliseconds: 350));

    expect(container.read(movieLibraryQueryProvider).search, 'alien');
  });
}
