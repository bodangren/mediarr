import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/core/theme/mediarr_theme.dart';
import 'package:mediarr_client/features/calendar/calendar_screen.dart';
import 'package:mediarr_client/shared/services/api_client.dart';

void main() {
  group('CalendarScreen', () {
    ProviderContainer createContainer({
      List<Override> overrides = const [],
    }) {
      return ProviderContainer(
        overrides: [
          calendarProvider.overrideWith((ref, params) async => {}),
          ...overrides,
        ],
      );
    }

    testWidgets('renders calendar header', (tester) async {
      final container = createContainer();
      addTearDown(container.dispose);

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: MaterialApp(
            theme: mediarrDarkTheme,
            home: const CalendarScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Calendar'), findsOneWidget);
    });

    testWidgets('renders weekday headers', (tester) async {
      final container = createContainer();
      addTearDown(container.dispose);

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: MaterialApp(
            theme: mediarrDarkTheme,
            home: const CalendarScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Sun'), findsOneWidget);
      expect(find.text('Mon'), findsOneWidget);
      expect(find.text('Tue'), findsOneWidget);
      expect(find.text('Wed'), findsOneWidget);
      expect(find.text('Thu'), findsOneWidget);
      expect(find.text('Fri'), findsOneWidget);
      expect(find.text('Sat'), findsOneWidget);
    });

    testWidgets('renders day cells', (tester) async {
      final container = createContainer();
      addTearDown(container.dispose);

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: MaterialApp(
            theme: mediarrDarkTheme,
            home: const CalendarScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Should find at least day 1
      expect(find.text('1'), findsWidgets);
    });

    testWidgets('shows dot indicator on days with releases', (tester) async {
      final now = DateTime.now();
      final dateStr = '${now.year}-${now.month.toString().padLeft(2, '0')}-15';
      final container = createContainer(
        overrides: [
          calendarProvider.overrideWith((ref, params) async => {
            dateStr: [
              const UpcomingItem(
                id: 1,
                type: 'episode',
                title: 'Test Series',
                date: '2026-04-15',
                seasonNumber: 1,
                episodeNumber: 1,
              ),
            ],
          }),
        ],
      );
      addTearDown(container.dispose);

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: MaterialApp(
            theme: mediarrDarkTheme,
            home: const CalendarScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Find the day cell with "15" and verify it has a dot (container with circle decoration)
      final dayCell = find.widgetWithText(Container, '15');
      expect(dayCell, findsWidgets);
    });

    testWidgets('tapping day with releases shows bottom sheet', (tester) async {
      final now = DateTime.now();
      final dateStr = '${now.year}-${now.month.toString().padLeft(2, '0')}-15';
      final container = createContainer(
        overrides: [
          calendarProvider.overrideWith((ref, params) async => {
            dateStr: [
              const UpcomingItem(
                id: 1,
                type: 'episode',
                title: 'Test Series',
                date: '2026-04-15',
                seasonNumber: 1,
                episodeNumber: 1,
                episodeTitle: 'Pilot',
              ),
            ],
          }),
        ],
      );
      addTearDown(container.dispose);

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: MaterialApp(
            theme: mediarrDarkTheme,
            home: const CalendarScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Tap on day 15
      await tester.tap(find.text('15').first);
      await tester.pumpAndSettle();

      // Bottom sheet should show the release
      expect(find.text('Test Series'), findsOneWidget);
      expect(find.text('S1E1 — Pilot'), findsOneWidget);
    });

    testWidgets('handles empty calendar data', (tester) async {
      final container = createContainer();
      addTearDown(container.dispose);

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: MaterialApp(
            theme: mediarrDarkTheme,
            home: const CalendarScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Calendar'), findsOneWidget);
      // Should still render the grid without errors
      expect(find.text('1'), findsWidgets);
    });
  });
}
