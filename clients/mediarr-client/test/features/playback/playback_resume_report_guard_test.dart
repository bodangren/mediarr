import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/features/playback/playback_service.dart';

/// Owner defect 2026-11-08: resuming at 27% reported position 6 s and overwrote the bookmark.
void main() {
  group('shouldSkipProgressReport', () {
    test('suppresses an early report that is far behind the resume target', () {
      expect(
        shouldSkipProgressReport(
          position: const Duration(seconds: 6),
          resumeTarget: const Duration(seconds: 2315),
          sincePlayStart: const Duration(seconds: 2),
        ),
        isTrue,
      );
    });

    test('allows reports once the seek has landed', () {
      expect(
        shouldSkipProgressReport(
          position: const Duration(seconds: 2320),
          resumeTarget: const Duration(seconds: 2315),
          sincePlayStart: const Duration(seconds: 3),
        ),
        isFalse,
      );
    });

    test('allows reports after the grace window or without a resume target', () {
      expect(
        shouldSkipProgressReport(
          position: const Duration(seconds: 5),
          resumeTarget: const Duration(seconds: 2315),
          sincePlayStart: const Duration(seconds: 45),
        ),
        isFalse,
      );
      expect(
        shouldSkipProgressReport(
          position: const Duration(seconds: 5),
          resumeTarget: null,
          sincePlayStart: const Duration(seconds: 2),
        ),
        isFalse,
      );
    });
  });
}
