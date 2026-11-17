import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:mediarr_client/shared/services/api_config.dart';

import '../../../core/theme/mediarr_theme.dart';
import '../../../core/widgets/netflix_scaffold.dart';

class MediaHeroAction {
  const MediaHeroAction({
    required this.label,
    required this.icon,
    this.onPressed,
  });

  final String label;
  final IconData icon;
  final VoidCallback? onPressed;
}

/// Largest title font size, in logical px, that fits [text] in [maxLines].
///
/// FR-2 (owner report 2026-11-16: "the title can often be ellipsed (How I met
/// your Mother, for instance)"): the series-detail screen puts this hero in a
/// two-pane layout whose left column leaves only ~300 px for the title, while
/// the banner title was pinned at 44 px with `maxLines: 2` + ellipsis — so
/// "How I Met Your Mother" needed a third line and was clipped. The title is
/// now measured and shrunk until it fits on at most [maxLines] lines, which
/// keeps it fully readable instead of truncated.
///
/// Pure and side-effect free, so it is unit-tested directly.
double fitTitleFontSize(
  String text, {
  required double maxWidth,
  int maxLines = 2,
  double maxSize = 44,
  double minSize = 14,
  FontWeight fontWeight = FontWeight.w800,
  TextScaler textScaler = TextScaler.noScaling,
}) {
  if (!maxWidth.isFinite || maxWidth <= 0) return maxSize;
  // Measure against a slightly smaller budget than the layout grants. A
  // TextPainter that reports "fits" at exactly the available width still
  // overflows when the Text lays out (rounding + sub-pixel), which is how the
  // device kept clipping "How I Met Your Mother" to "How I Met / Your" at 42 px
  // while the helper believed it fitted (probe 2026-11-17: width 464,
  // didExceedMaxLines=true at the returned size).
  final budget = maxWidth * 0.94;
  var size = maxSize;
  while (size > minSize) {
    final painter = TextPainter(
      text: TextSpan(
        text: text,
        style: TextStyle(fontSize: size, fontWeight: fontWeight),
      ),
      maxLines: maxLines,
      textDirection: TextDirection.ltr,
      // Measure with the scaler the Text will actually render with. Android TV
      // runs a non-1.0 font scale, and measuring at 1.0 produced a size that
      // still overflowed on the device (the title clipped to "How I Met /
      // Your" while the test passed).
      textScaler: textScaler,
    )..layout(maxWidth: budget);
    final fits = !painter.didExceedMaxLines;
    painter.dispose();
    // One extra step of headroom on top of a fitting size.
    if (fits) return size > minSize + 2 ? size - 2 : size;
    size -= 2;
  }
  return minSize;
}

/// Backdrop-led header for detail screens.
///
/// [backdropUrl] must be a landscape image. A portrait [posterUrl] is shown as
/// a poster tile next to the title: cropping a poster into the banner looked
/// broken (F11 in tv-ux-investigation-20260924).
class MediaHero extends StatelessWidget {
  const MediaHero({
    super.key,
    this.backdropUrl,
    this.posterUrl,
    required this.title,
    this.subtitle,
    this.actions = const [],
    this.height = 340,
  });

  final String? backdropUrl;
  final String? posterUrl;
  final String title;
  final String? subtitle;
  final List<MediaHeroAction> actions;

  /// Banner height. The series-detail layout uses a compact banner so the
  /// episode list is on screen without scrolling (owner report 2026-11-07:
  /// "everything is too small and off screen until I arrow down to it").
  final double height;

  @override
  Widget build(BuildContext context) {
    final backdrop = backdropUrl;
    return SizedBox(
      width: double.infinity,
      height: height,
      child: Stack(
        fit: StackFit.expand,
        children: [
          if (backdrop != null)
            CachedNetworkImage(
              imageUrl: ApiConfig.image(backdrop),
              fit: BoxFit.cover,
              placeholder: (_, __) =>
                  Container(color: MediarrColors.surfaceElevated),
              errorWidget: (_, __, ___) =>
                  Container(color: MediarrColors.surfaceElevated),
            )
          else
            const DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [MediarrColors.surfaceElevated, MediarrColors.surfaceBase],
                ),
              ),
            ),
          // Readability scrim over the artwork.
          DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.centerLeft,
                end: Alignment.centerRight,
                colors: [
                  Colors.black.withValues(alpha: 0.75),
                  Colors.black.withValues(alpha: 0.25),
                ],
              ),
            ),
          ),
          Positioned(
            left: 24,
            right: 24,
            bottom: 20,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                if (posterUrl != null)
                  Padding(
                    padding: const EdgeInsets.only(right: 24),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: SizedBox(
                        width: 150,
                        height: 225,
                        child: CachedNetworkImage(
                          imageUrl: ApiConfig.image(posterUrl!),
                          fit: BoxFit.cover,
                          placeholder: (_, __) => Container(
                              color: MediarrColors.surfaceElevated),
                          errorWidget: (_, __, ___) => Container(
                              color: MediarrColors.surfaceElevated),
                        ),
                      ),
                    ),
                  ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      LayoutBuilder(
                        builder: (context, constraints) {
                          // FR-2: auto-shrink so the title never ellipses.
                          final fontSize = fitTitleFontSize(
                            title,
                            maxWidth: constraints.maxWidth,
                            textScaler: MediaQuery.textScalerOf(context),
                          );
                          return Text(
                            title,
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: fontSize,
                              fontWeight: FontWeight.w800,
                              shadows: const [
                                Shadow(blurRadius: 12, color: Colors.black),
                              ],
                            ),
                            maxLines: 2,
                            softWrap: true,
                          );
                        },
                      ),
                      if (subtitle != null) ...[
                        const SizedBox(height: 8),
                        Text(
                          subtitle!,
                          style: const TextStyle(
                            color: Colors.white70,
                            fontSize: 24,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                      if (actions.isNotEmpty) ...[
                        const SizedBox(height: 16),
                        Wrap(
                          spacing: 12,
                          children: [
                            for (final action in actions)
                              // One focus cue on every TV control.
                              FocusableAction(
                                variant: FocusableActionVariant.button,
                                onSelect: action.onPressed,
                                borderRadius: 8,
                                child: Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 20, vertical: 12),
                                  decoration: BoxDecoration(
                                    color:
                                        Colors.white.withValues(alpha: 0.18),
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(
                                      color:
                                          Colors.white.withValues(alpha: 0.5),
                                    ),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(action.icon,
                                          size: 28, color: Colors.white),
                                      const SizedBox(width: 8),
                                      Text(
                                        action.label,
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontSize: 20,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
