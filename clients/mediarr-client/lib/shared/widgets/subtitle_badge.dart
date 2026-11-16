import 'package:flutter/material.dart';

import '../../core/theme/mediarr_theme.dart';
import '../models/subtitle_availability.dart';

/// Badge stating whether an item has Chinese/English subtitles (FR-5).
///
/// Owner report 2026-11-16: "All videos should have a badge which indicates
/// whether the required chinese / english subs exist." The data is server truth
/// (`subtitleAvailability` on the movie/episode payload), never a filename
/// guess, so the badge and the subtitle coverage report cannot disagree.
///
/// States: `中英` (both), `中文` (Chinese only), `EN` (English only) and a muted
/// `无字幕` marker when neither exists. Callers only render it for items that
/// have a file — a movie that has not been downloaded has no subtitles to
/// report and must not be labelled as missing them.
class SubtitleBadge extends StatelessWidget {
  const SubtitleBadge({
    super.key,
    required this.availability,
    this.compact = false,
  });

  final SubtitleAvailability availability;

  /// Smaller variant for poster corners and episode-row trailing slots.
  final bool compact;

  (Color, Color, String) get _style {
    if (availability.zh && availability.en) {
      return (const Color(0xFF22C55E), const Color(0xFF062E17), '中英');
    }
    if (availability.zh) {
      return (const Color(0xFF38BDF8), const Color(0xFF062435), '中文');
    }
    if (availability.en) {
      return (const Color(0xFFA78BFA), const Color(0xFF1A1030), 'EN');
    }
    return (MediarrColors.textMuted, const Color(0xFF15171C), '无字幕');
  }

  @override
  Widget build(BuildContext context) {
    final (foreground, background, label) = _style;
    return Container(
      key: Key('subtitle-badge-$label'),
      padding: EdgeInsets.symmetric(
        horizontal: compact ? 5 : 8,
        vertical: compact ? 1 : 3,
      ),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: foreground.withValues(alpha: 0.65)),
      ),
      child: Text(
        label,
        maxLines: 1,
        style: TextStyle(
          color: foreground,
          fontSize: compact ? 12 : 15,
          fontWeight: FontWeight.w700,
          height: 1.1,
        ),
      ),
    );
  }
}
