import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/features/playback/playback_service.dart';

void main() {
  group('shouldRetryResumeSeek', () {
    const target = Duration(seconds: 2315);

    test('retries when playback sits far behind the resume target', () {
      expect(shouldRetryResumeSeek(position: const Duration(seconds: 3), resumeTarget: target, sinceLastAttempt: const Duration(seconds: 2), attempts: 0), isTrue);
    });

    test('throttles and caps retries', () {
      expect(shouldRetryResumeSeek(position: const Duration(seconds: 3), resumeTarget: target, sinceLastAttempt: const Duration(milliseconds: 200), attempts: 0), isFalse);
      expect(shouldRetryResumeSeek(position: const Duration(seconds: 3), resumeTarget: target, sinceLastAttempt: const Duration(seconds: 2), attempts: 6), isFalse);
    });

    test('stops once the seek landed', () {
      expect(shouldRetryResumeSeek(position: const Duration(seconds: 2320), resumeTarget: target, sinceLastAttempt: const Duration(seconds: 2), attempts: 1), isFalse);
      expect(shouldRetryResumeSeek(position: const Duration(seconds: 3), resumeTarget: null, sinceLastAttempt: const Duration(seconds: 2), attempts: 0), isFalse);
    });
  });
}
