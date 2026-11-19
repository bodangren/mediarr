import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/core/widgets/netflix_scaffold.dart';
import 'package:mediarr_client/shared/widgets/digital_clock.dart';

/// Owner request 2026-11-19: *"We need a digital clock in the top right when
/// videos aren't playing, or on overlay when videos are playing."*
void main() {
  group('DigitalClock.format', () {
    test('renders 24-hour HH:mm', () {
      expect(DigitalClock.format(DateTime(2026, 11, 19, 9, 5)), '09:05');
      expect(DigitalClock.format(DateTime(2026, 11, 19, 23, 59)), '23:59');
      expect(DigitalClock.format(DateTime(2026, 11, 19, 0, 0)), '00:00');
    });

    test('can include seconds when asked', () {
      final time = DateTime(2026, 11, 19, 7, 8, 9);
      expect(DigitalClock.format(time), '07:08');
      expect(DigitalClock.format(time, showSeconds: true), '07:08:09');
    });
  });

  testWidgets('ticks once the minute changes and not before', (tester) async {
    var now = DateTime(2026, 11, 19, 20, 41, 30);
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: DigitalClock(now: () => now),
        ),
      ),
    );

    expect(find.text('20:41'), findsOneWidget);

    // Still inside the same minute: the seconds tick but the text does not change.
    now = DateTime(2026, 11, 19, 20, 41, 55);
    await tester.pump(const Duration(seconds: 1));
    expect(find.text('20:41'), findsOneWidget);

    now = DateTime(2026, 11, 19, 20, 42, 2);
    await tester.pump(const Duration(seconds: 1));
    expect(find.text('20:42'), findsOneWidget);
  });

  testWidgets('the shell marker prevents a second clock inside a page', (tester) async {
    // Library pages live inside LeanbackScaffold (which draws the clock) and also
    // wrap themselves in NetflixScaffold: without the marker both would draw one.
    await tester.pumpWidget(
      MaterialApp(
        home: ClockScope(
          present: true,
          child: NetflixScaffold(child: const SizedBox.shrink()),
        ),
      ),
    );
    expect(find.byType(DigitalClock), findsNothing);

    await tester.pumpWidget(
      MaterialApp(home: NetflixScaffold(child: const SizedBox.shrink())),
    );
    expect(find.byType(DigitalClock), findsOneWidget);
  });
}
