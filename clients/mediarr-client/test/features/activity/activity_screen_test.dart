import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/core/theme/mediarr_theme.dart';
import 'package:mediarr_client/features/activity/activity_screen.dart';
import 'package:mediarr_client/shared/services/api_client.dart';

class MockTorrentsNotifier extends TorrentsNotifier {
  MockTorrentsNotifier(TorrentsState initialState) : super(_FakeRef(), skipInit: true) {
    state = initialState;
  }

  @override
  Future<void> refresh() async {}
}

class MockActivityNotifier extends ActivityNotifier {
  MockActivityNotifier(ActivityState initialState) : super(_FakeRef(), skipInit: true) {
    state = initialState;
  }

  @override
  Future<void> refresh() async {}
}

class _FakeRef implements Ref {
  @override
  T read<T>(ProviderListenable<T> provider) {
    throw UnimplementedError();
  }

  @override
  ProviderSubscription<T> listen<T>(
    ProviderListenable<T> provider,
    void Function(T? previous, T next) listener, {
    void Function(Object error, StackTrace stackTrace)? onError,
    bool fireImmediately = false,
  }) {
    throw UnimplementedError();
  }

  @override
  ProviderContainer get container => throw UnimplementedError();

  @override
  void invalidate(ProviderOrFamily provider) {
    throw UnimplementedError();
  }

  @override
  void invalidateSelf() {
    throw UnimplementedError();
  }

  @override
  bool exists(ProviderBase<Object?> provider) {
    throw UnimplementedError();
  }

  @override
  KeepAliveLink keepAlive() {
    throw UnimplementedError();
  }

  @override
  void listenSelf(
    void Function(Object? previous, Object? next) listener, {
    void Function(Object error, StackTrace stackTrace)? onError,
  }) {
    throw UnimplementedError();
  }

  @override
  void notifyListeners() {
    throw UnimplementedError();
  }

  @override
  void onAddListener(void Function() cb) {
    throw UnimplementedError();
  }

  @override
  void onCancel(void Function() cb) {
    throw UnimplementedError();
  }

  @override
  void onDispose(void Function() cb) {
    throw UnimplementedError();
  }

  @override
  void onRemoveListener(void Function() cb) {
    throw UnimplementedError();
  }

  @override
  void onResume(void Function() cb) {
    throw UnimplementedError();
  }

  @override
  T refresh<T>(Refreshable<T> provider) {
    throw UnimplementedError();
  }

  @override
  T watch<T>(ProviderListenable<T> provider) {
    throw UnimplementedError();
  }
}

void main() {
  group('ActivityScreen', () {
    testWidgets('renders Activity title and tab bar', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            torrentsProvider.overrideWith((ref) => MockTorrentsNotifier(
              const TorrentsState(items: [], isLoading: false),
            )),
            activityProvider.overrideWith((ref) => MockActivityNotifier(
              const ActivityState(events: [], isLoading: false),
            )),
          ],
          child: MaterialApp(
            theme: mediarrDarkTheme,
            home: const Scaffold(body: ActivityScreen()),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Activity'), findsOneWidget);
      expect(find.text('Queue'), findsOneWidget);
      expect(find.text('History'), findsOneWidget);
    });

    testWidgets('shows Queue tab by default', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            torrentsProvider.overrideWith((ref) => MockTorrentsNotifier(
              const TorrentsState(items: [], isLoading: false),
            )),
            activityProvider.overrideWith((ref) => MockActivityNotifier(
              const ActivityState(events: [], isLoading: false),
            )),
          ],
          child: MaterialApp(
            theme: mediarrDarkTheme,
            home: const Scaffold(body: ActivityScreen()),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.byIcon(Icons.downloading), findsOneWidget);
    });

    testWidgets('shows empty state when no torrents', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            torrentsProvider.overrideWith((ref) => MockTorrentsNotifier(
              const TorrentsState(items: [], isLoading: false),
            )),
            activityProvider.overrideWith((ref) => MockActivityNotifier(
              const ActivityState(events: [], isLoading: false),
            )),
          ],
          child: MaterialApp(
            theme: mediarrDarkTheme,
            home: const Scaffold(body: ActivityScreen()),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('No active downloads'), findsOneWidget);
    });

    testWidgets('shows torrent items when loaded', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            torrentsProvider.overrideWith((ref) => MockTorrentsNotifier(
              const TorrentsState(
                items: [
                  TorrentItem(
                    infoHash: 'abc123',
                    name: 'Test.Movie.2024.S01E01.1080p.WEB',
                    status: 'downloading',
                    progress: 45.5,
                    downloadSpeed: 1024000,
                    uploadSpeed: 0,
                    size: 1500000000,
                    eta: 3600,
                  ),
                ],
                isLoading: false,
              ),
            )),
            activityProvider.overrideWith((ref) => MockActivityNotifier(
              const ActivityState(events: [], isLoading: false),
            )),
          ],
          child: MaterialApp(
            theme: mediarrDarkTheme,
            home: const Scaffold(body: ActivityScreen()),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Test.Movie.2024.S01E01.1080p.WEB'), findsOneWidget);
      expect(find.textContaining('45.5%'), findsOneWidget);
    });

    testWidgets('shows loading indicator while loading torrents',
        (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            torrentsProvider.overrideWith((ref) => MockTorrentsNotifier(
              const TorrentsState(items: [], isLoading: true),
            )),
            activityProvider.overrideWith((ref) => MockActivityNotifier(
              const ActivityState(events: [], isLoading: false),
            )),
          ],
          child: MaterialApp(
            theme: mediarrDarkTheme,
            home: const Scaffold(body: ActivityScreen()),
          ),
        ),
      );

      await tester.pump();
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('switches to History tab when tapped', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            torrentsProvider.overrideWith((ref) => MockTorrentsNotifier(
              const TorrentsState(items: [], isLoading: false),
            )),
            activityProvider.overrideWith((ref) => MockActivityNotifier(
              const ActivityState(events: [], isLoading: false),
            )),
          ],
          child: MaterialApp(
            theme: mediarrDarkTheme,
            home: const Scaffold(body: ActivityScreen()),
          ),
        ),
      );

      await tester.pumpAndSettle();

      await tester.tap(find.text('History'));
      await tester.pumpAndSettle();

      expect(find.text('No activity yet'), findsOneWidget);
    });

    testWidgets('shows activity events when loaded', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            torrentsProvider.overrideWith((ref) => MockTorrentsNotifier(
              const TorrentsState(items: [], isLoading: false),
            )),
            activityProvider.overrideWith((ref) => MockActivityNotifier(
              ActivityState(
                events: [
                  ActivityEvent(
                    id: 1,
                    eventType: 'download',
                    sourceModule: 'TorrentManager',
                    success: true,
                    summary: 'Downloaded Test.Movie.2024.mkv',
                    occurredAt: DateTime.now().subtract(const Duration(hours: 1)),
                  ),
                ],
                isLoading: false,
              ),
            )),
          ],
          child: MaterialApp(
            theme: mediarrDarkTheme,
            home: const Scaffold(body: ActivityScreen()),
          ),
        ),
      );

      await tester.pumpAndSettle();

      await tester.tap(find.text('History'));
      await tester.pumpAndSettle();

      expect(find.text('Downloaded Test.Movie.2024.mkv'), findsOneWidget);
    });

    testWidgets('shows error state when torrent load fails', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            torrentsProvider.overrideWith((ref) => MockTorrentsNotifier(
              const TorrentsState(
                items: [],
                isLoading: false,
                error: 'Failed to load torrents',
              ),
            )),
            activityProvider.overrideWith((ref) => MockActivityNotifier(
              const ActivityState(events: [], isLoading: false),
            )),
          ],
          child: MaterialApp(
            theme: mediarrDarkTheme,
            home: const Scaffold(body: ActivityScreen()),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.textContaining('Failed to load queue'), findsOneWidget);
    });

    testWidgets('shows error state when activity load fails', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            torrentsProvider.overrideWith((ref) => MockTorrentsNotifier(
              const TorrentsState(items: [], isLoading: false),
            )),
            activityProvider.overrideWith((ref) => MockActivityNotifier(
              const ActivityState(
                events: [],
                isLoading: false,
                error: 'Failed to load activity',
              ),
            )),
          ],
          child: MaterialApp(
            theme: mediarrDarkTheme,
            home: const Scaffold(body: ActivityScreen()),
          ),
        ),
      );

      await tester.pumpAndSettle();

      await tester.tap(find.text('History'));
      await tester.pumpAndSettle();

      expect(find.textContaining('Failed to load history'), findsOneWidget);
    });

    testWidgets('shows completed badge for completed torrents', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            torrentsProvider.overrideWith((ref) => MockTorrentsNotifier(
              const TorrentsState(
                items: [
                  TorrentItem(
                    infoHash: 'abc123',
                    name: 'Complete.Movie.2024.1080p',
                    status: 'completed',
                    progress: 100.0,
                    downloadSpeed: 0,
                    uploadSpeed: 50000,
                    size: 2000000000,
                  ),
                ],
                isLoading: false,
              ),
            )),
            activityProvider.overrideWith((ref) => MockActivityNotifier(
              const ActivityState(events: [], isLoading: false),
            )),
          ],
          child: MaterialApp(
            theme: mediarrDarkTheme,
            home: const Scaffold(body: ActivityScreen()),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Complete.Movie.2024.1080p'), findsOneWidget);
      expect(find.text('Complete'), findsNWidgets(2));
    });

    testWidgets('shows paused badge for paused torrents', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            torrentsProvider.overrideWith((ref) => MockTorrentsNotifier(
              const TorrentsState(
                items: [
                  TorrentItem(
                    infoHash: 'abc123',
                    name: 'Paused.Movie.2024.1080p',
                    status: 'paused',
                    progress: 50.0,
                    downloadSpeed: 0,
                    uploadSpeed: 0,
                    size: 2000000000,
                  ),
                ],
                isLoading: false,
              ),
            )),
            activityProvider.overrideWith((ref) => MockActivityNotifier(
              const ActivityState(events: [], isLoading: false),
            )),
          ],
          child: MaterialApp(
            theme: mediarrDarkTheme,
            home: const Scaffold(body: ActivityScreen()),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Paused.Movie.2024.1080p'), findsOneWidget);
      expect(find.text('Paused'), findsOneWidget);
    });

    testWidgets('shows failed event icon for failed events', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            torrentsProvider.overrideWith((ref) => MockTorrentsNotifier(
              const TorrentsState(items: [], isLoading: false),
            )),
            activityProvider.overrideWith((ref) => MockActivityNotifier(
              ActivityState(
                events: [
                  ActivityEvent(
                    id: 1,
                    eventType: 'import',
                    sourceModule: 'ImportManager',
                    success: false,
                    summary: 'Failed to import episode',
                    occurredAt: DateTime.now(),
                  ),
                ],
                isLoading: false,
              ),
            )),
          ],
          child: MaterialApp(
            theme: mediarrDarkTheme,
            home: const Scaffold(body: ActivityScreen()),
          ),
        ),
      );

      await tester.pumpAndSettle();

      await tester.tap(find.text('History'));
      await tester.pumpAndSettle();

      expect(find.text('Failed to import episode'), findsOneWidget);
      expect(find.byIcon(Icons.error_outline), findsOneWidget);
    });
  });
}
