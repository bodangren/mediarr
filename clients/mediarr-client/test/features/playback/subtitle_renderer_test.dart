import 'package:flutter_test/flutter_test.dart';
import 'package:mediarr_client/features/playback/subtitle_renderer.dart';

/// FR-7 — `SubtitleDelay` is a value type used for the toast label. We pin
/// the formatter/parser here because the brief calls out the exact text
/// surface ("Subs +1.5s") shown to the user when the offset changes.
void main() {
  group('SubtitleDelay.format', () {
    test('returns null for zero offset', () {
      expect(SubtitleDelay.format(Duration.zero), isNull);
    });

    test('formats whole-second positive offsets', () {
      expect(SubtitleDelay.format(const Duration(seconds: 1)), 'Subs +1s');
      expect(SubtitleDelay.format(const Duration(seconds: 5)), 'Subs +5s');
    });

    test('formats whole-second negative offsets', () {
      expect(SubtitleDelay.format(const Duration(seconds: -1)), 'Subs -1s');
      expect(SubtitleDelay.format(const Duration(seconds: -5)), 'Subs -5s');
    });

    test('formats sub-second offsets with one decimal', () {
      expect(
        SubtitleDelay.format(const Duration(milliseconds: 500)),
        'Subs +0.5s',
      );
      expect(
        SubtitleDelay.format(const Duration(milliseconds: -500)),
        'Subs -0.5s',
      );
    });

    test('formats compound offsets like +1.5s', () {
      expect(
        SubtitleDelay.format(const Duration(milliseconds: 1500)),
        'Subs +1.5s',
      );
    });
  });

  group('SubtitleDelay.parse', () {
    test('parses positive labels', () {
      expect(SubtitleDelay.parse('Subs +1s'), const Duration(seconds: 1));
      expect(SubtitleDelay.parse('Subs +5s'), const Duration(seconds: 5));
    });

    test('parses negative labels', () {
      expect(SubtitleDelay.parse('Subs -0.5s'), const Duration(milliseconds: -500));
    });

    test('parses decimal labels', () {
      expect(SubtitleDelay.parse('Subs +1.5s'), const Duration(milliseconds: 1500));
    });

    test('returns Duration.zero for null / unparseable', () {
      expect(SubtitleDelay.parse(null), Duration.zero);
      expect(SubtitleDelay.parse(''), Duration.zero);
      expect(SubtitleDelay.parse('garbage'), Duration.zero);
    });

    test('round-trips through format → parse for canonical offsets', () {
      for (final offset in const [
        Duration(seconds: 1),
        Duration(seconds: -2),
        Duration(milliseconds: 500),
        Duration(milliseconds: 1500),
        Duration(milliseconds: -5500),
      ]) {
        final formatted = SubtitleDelay.format(offset);
        expect(formatted, isNotNull);
        expect(SubtitleDelay.parse(formatted), offset);
      }
    });
  });
}
