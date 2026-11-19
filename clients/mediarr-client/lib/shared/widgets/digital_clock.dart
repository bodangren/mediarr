import 'dart:async';
import 'package:flutter/material.dart';

import '../../core/theme/mediarr_theme.dart';

/// Wall clock for the ten-foot UI (owner request 2026-11-19: *"We need a digital
/// clock in the top right when videos aren't playing, or on overlay when videos
/// are playing"*).
///
/// 24-hour `HH:mm`, no seconds: a living-room clock is read at a glance from the
/// couch, and a ticking second field would redraw the screen every second for
/// nothing. The widget still wakes once a second but only rebuilds when the
/// rendered text changes, so a minute costs exactly one frame.
class DigitalClock extends StatefulWidget {
  const DigitalClock({
    super.key,
    this.style,
    this.now,
    this.showSeconds = false,
  });

  /// Text style override; defaults to the muted ten-foot clock style.
  final TextStyle? style;

  /// Test seam: source of "now". Defaults to [DateTime.now].
  final DateTime Function()? now;

  /// Owner did not ask for seconds; kept explicit so a future request is a flag,
  /// not a rewrite.
  final bool showSeconds;

  /// `HH:mm` (or `HH:mm:ss`) in 24-hour form.
  static String format(DateTime time, {bool showSeconds = false}) {
    final hour = time.hour.toString().padLeft(2, '0');
    final minute = time.minute.toString().padLeft(2, '0');
    if (!showSeconds) return '$hour:$minute';
    final second = time.second.toString().padLeft(2, '0');
    return '$hour:$minute:$second';
  }

  @override
  State<DigitalClock> createState() => _DigitalClockState();
}

class _DigitalClockState extends State<DigitalClock> {
  Timer? _timer;
  late String _text;

  DateTime _read() => (widget.now ?? DateTime.now)();

  @override
  void initState() {
    super.initState();
    _text = DigitalClock.format(_read(), showSeconds: widget.showSeconds);
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      final next = DigitalClock.format(_read(), showSeconds: widget.showSeconds);
      if (next == _text) return;
      setState(() => _text = next);
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final style = widget.style ??
        const TextStyle(
          color: MediarrColors.textSecondary,
          fontSize: 24,
          fontWeight: FontWeight.w600,
          // Tabular figures stop the clock from jittering as digits change.
          fontFeatures: [FontFeature.tabularFigures()],
        );
    return ExcludeSemantics(
      child: Text(
        _text,
        key: const ValueKey('digital-clock'),
        style: style,
      ),
    );
  }
}

/// Marks a subtree that already shows the clock.
///
/// The shell renders the wall clock for every routed page; library pages also
/// wrap themselves in [NetflixScaffold], which renders one when it is the
/// outermost surface. Without this marker a shell page would show two clocks.
class ClockScope extends InheritedWidget {
  const ClockScope({
    super.key,
    required this.present,
    required super.child,
  });

  final bool present;

  static bool alreadyShown(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<ClockScope>()?.present ?? false;

  @override
  bool updateShouldNotify(ClockScope oldWidget) => oldWidget.present != present;
}

/// The clock as it is drawn in a corner: a soft plate so it stays readable over
/// artwork and video, with no focus involvement whatsoever (ten-foot UI rule:
/// the clock is information, not a stop on the D-pad).
class ClockBadge extends StatelessWidget {
  const ClockBadge({super.key, this.style, this.padding});

  final TextStyle? style;
  final EdgeInsetsGeometry? padding;

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: ExcludeSemantics(
        child: DecoratedBox(
          decoration: BoxDecoration(
            color: Colors.black.withValues(alpha: 0.35),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Padding(
            padding: padding ?? const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            child: DigitalClock(style: style),
          ),
        ),
      ),
    );
  }
}
