import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/shared/providers/library_refresh.dart';

void main() {
  group('shouldRefreshOnLifecycleChange', () {
    test('refreshes when the app returns to the foreground', () {
      expect(
        shouldRefreshOnLifecycleChange(
          AppLifecycleState.paused,
          AppLifecycleState.resumed,
        ),
        isTrue,
      );
      // TV activity regaining focus commonly goes inactive -> resumed.
      expect(
        shouldRefreshOnLifecycleChange(
          AppLifecycleState.inactive,
          AppLifecycleState.resumed,
        ),
        isTrue,
      );
      expect(
        shouldRefreshOnLifecycleChange(
          AppLifecycleState.hidden,
          AppLifecycleState.resumed,
        ),
        isTrue,
      );
      expect(
        shouldRefreshOnLifecycleChange(null, AppLifecycleState.resumed),
        isTrue,
      );
    });

    test(
      'does not refresh on leaving the foreground or on repeated resume events',
      () {
        expect(
          shouldRefreshOnLifecycleChange(
            AppLifecycleState.resumed,
            AppLifecycleState.paused,
          ),
          isFalse,
        );
        expect(
          shouldRefreshOnLifecycleChange(
            AppLifecycleState.resumed,
            AppLifecycleState.resumed,
          ),
          isFalse,
        );
        expect(
          shouldRefreshOnLifecycleChange(
            AppLifecycleState.paused,
            AppLifecycleState.paused,
          ),
          isFalse,
        );
      },
    );
  });

  group('AppResumeRefresher', () {
    testWidgets(
      'runs the refresh callback and bumps the signal on resume only',
      (tester) async {
        final container = ProviderContainer();
        addTearDown(container.dispose);
        addTearDown(() {
          // Leave the binding in a sane state for the next test.
          tester.binding.handleAppLifecycleStateChanged(
            AppLifecycleState.resumed,
          );
        });

        var resumeCount = 0;
        await tester.pumpWidget(
          UncontrolledProviderScope(
            container: container,
            child: AppResumeRefresher(
              onResumed: () => resumeCount++,
              child: const SizedBox.shrink(),
            ),
          ),
        );

        expect(resumeCount, 0);
        expect(container.read(libraryRefreshProvider), 0);

        // Going to the background must not refresh.
        tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
        await tester.pump();
        expect(resumeCount, 0);
        expect(container.read(libraryRefreshProvider), 0);

        // Returning to the foreground refreshes exactly once.
        tester.binding.handleAppLifecycleStateChanged(
          AppLifecycleState.resumed,
        );
        await tester.pump();
        expect(resumeCount, 1);
        expect(container.read(libraryRefreshProvider), 1);

        // A duplicate resumed event does not re-fetch in a loop.
        tester.binding.handleAppLifecycleStateChanged(
          AppLifecycleState.resumed,
        );
        await tester.pump();
        expect(resumeCount, 1);
        expect(container.read(libraryRefreshProvider), 1);

        // And the next real background/foreground cycle refreshes again.
        tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
        tester.binding.handleAppLifecycleStateChanged(
          AppLifecycleState.resumed,
        );
        await tester.pump();
        expect(resumeCount, 2);
        expect(container.read(libraryRefreshProvider), 2);
      },
    );
  });
}
