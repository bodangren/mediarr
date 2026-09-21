import 'dart:async';

import 'package:media_kit/media_kit.dart';

/// Side-effect-free renderer interface for the subtitle timing nudge (FR-7).
///
/// The renderer is the bit of code that actually shifts cue display time
/// relative to the video clock. The contract is intentionally narrow:
///   - `setDelay(Duration)` sets the offset; positive shifts subs later
///     (cues appear later), negative shifts earlier.
///   - `getDelay()` reads the currently-applied offset.
///   - the renderer applies to whatever cue formats the player supports
///     (today: SRT and ASS via libass in `media_kit`; PGS is out of scope).
///
/// Defined as an interface so the playback service can be unit-tested
/// without standing up `media_kit`.
abstract class SubtitleRenderer {
  Future<void> setDelay(Duration delay);
  Future<Duration> getDelay();
}

/// No-op renderer used when the playback service is constructed without a
/// `MediaPlayer` subclass that exposes the underlying `Player`. Subtitle
/// nudge still mutates the public state; the offset is just not pushed to
/// any actual renderer. (Tests inject their own renderer.)
class NoOpSubtitleRenderer implements SubtitleRenderer {
  Duration _delay = Duration.zero;

  @override
  Future<void> setDelay(Duration delay) async {
    _delay = delay;
  }

  @override
  Future<Duration> getDelay() async => _delay;
}

/// Renderer used by tests to verify the offset passed to the renderer.
class FakeSubtitleRenderer implements SubtitleRenderer {
  final List<Duration> setDelays = [];
  Duration _current = Duration.zero;

  @override
  Future<void> setDelay(Duration delay) async {
    setDelays.add(delay);
    _current = delay;
  }

  @override
  Future<Duration> getDelay() async => _current;
}

/// Default production renderer that drives `media_kit`'s `sub-delay` libmpv
/// property. `sub-delay` is honoured by libass, which renders both SRT and
/// ASS — so the offset applies to both formats the brief calls out.
///
/// The `sub-delay` property is set on the underlying `Player.platform` via
/// media_kit's private `setProperty` / `getProperty` accessors. We use
/// `dynamic` because those methods are not on the public `PlatformPlayer`
/// interface but ARE on `NativePlayer` (Android, Linux, macOS, iOS,
/// Windows). On web (`WebPlayer`) they throw `UnimplementedError`, which we
/// swallow — the rest of the player still works, only the offset is a no-op.
class MediaKitSubtitleRenderer implements SubtitleRenderer {
  MediaKitSubtitleRenderer(this._player);

  final Player _player;

  @override
  Future<void> setDelay(Duration delay) async {
    final platform = _player.platform;
    if (platform == null) return;
    final seconds = delay.inMilliseconds / 1000.0;
    try {
      // ignore: avoid_dynamic_calls
      await (platform as dynamic).setProperty(
        'sub-delay',
        seconds.toString(),
      );
    } catch (_) {
      // sub-delay is not supported on every backend; ignore.
    }
  }

  @override
  Future<Duration> getDelay() async {
    final platform = _player.platform;
    if (platform == null) return Duration.zero;
    try {
      // ignore: avoid_dynamic_calls
      final value = await (platform as dynamic).getProperty('sub-delay');
      final parsed = double.tryParse(value as String) ?? 0.0;
      return Duration(milliseconds: (parsed * 1000).round());
    } catch (_) {
      return Duration.zero;
    }
  }
}

/// Snapshot of the active subtitle delay plus its rendered "toast" label.
class SubtitleDelay {
  const SubtitleDelay({
    required this.offset,
    required this.label,
  });

  /// Applied offset (may be negative).
  final Duration offset;

  /// User-facing label, e.g. "Subs +1.5s" or "Subs -0.5s". `null` when the
  /// offset is exactly zero (no nudge active).
  final String? label;

  /// Parse "Subs +1.5s" / "Subs -0.5s" / "Subs 0s" into a [Duration].
  /// Returns `Duration.zero` when [label] is `null` or unparseable.
  static Duration parse(String? label) {
    if (label == null) return Duration.zero;
    final match = RegExp(r'([+-]?\d+(?:\.\d+)?)s$').firstMatch(label);
    if (match == null) return Duration.zero;
    final seconds = double.tryParse(match.group(1)!);
    if (seconds == null) return Duration.zero;
    return Duration(milliseconds: (seconds * 1000).round());
  }

  /// Render a toast label for the given offset. Returns `null` when the
  /// offset is exactly zero.
  static String? format(Duration offset) {
    if (offset == Duration.zero) return null;
    final ms = offset.inMilliseconds;
    final sign = ms >= 0 ? '+' : '-';
    final magnitude = ms.abs();
    if (magnitude % 1000 == 0) {
      return 'Subs $sign${magnitude ~/ 1000}s';
    }
    final seconds = magnitude / 1000.0;
    final fixed = seconds.toStringAsFixed(seconds >= 10 ? 0 : 1);
    return 'Subs $sign${fixed}s';
  }
}
