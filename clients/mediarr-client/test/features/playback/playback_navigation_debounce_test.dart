import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/features/playback/playback_navigation.dart';

/// Owner defect 2026-11-08: episodes resumed at 0:00 even when the caller passed a position. Two
/// selects arrived for one interaction, pushing two PlaybackScreens; the second open dropped the
/// resume offset. The debounce makes that impossible within a short window.
void main() {
  setUp(resetPlaybackOpenDebounce);

  test('ignores a duplicate open for the same media inside the window', () {
    final t0 = DateTime.parse('2026-11-09T00:00:00Z');
    expect(shouldIgnoreDuplicateOpen(mediaId: 321, now: t0), isFalse);
    expect(shouldIgnoreDuplicateOpen(mediaId: 321, now: t0.add(const Duration(milliseconds: 120))), isTrue);
  });

  test('allows a different media or a later deliberate replay', () {
    final t0 = DateTime.parse('2026-11-09T00:00:00Z');
    expect(shouldIgnoreDuplicateOpen(mediaId: 321, now: t0), isFalse);
    expect(shouldIgnoreDuplicateOpen(mediaId: 382, now: t0.add(const Duration(milliseconds: 100))), isFalse);
    expect(shouldIgnoreDuplicateOpen(mediaId: 382, now: t0.add(const Duration(seconds: 2))), isFalse);
  });
}
