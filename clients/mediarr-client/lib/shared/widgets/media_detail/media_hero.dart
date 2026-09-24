import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

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
  });

  final String? backdropUrl;
  final String? posterUrl;
  final String title;
  final String? subtitle;
  final List<MediaHeroAction> actions;

  @override
  Widget build(BuildContext context) {
    final backdrop = backdropUrl;
    return SizedBox(
      width: double.infinity,
      height: 340,
      child: Stack(
        fit: StackFit.expand,
        children: [
          if (backdrop != null)
            CachedNetworkImage(
              imageUrl: backdrop,
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
                          imageUrl: posterUrl!,
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
                      Text(
                        title,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 44,
                          fontWeight: FontWeight.w800,
                          shadows: [
                            Shadow(blurRadius: 12, color: Colors.black),
                          ],
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
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
