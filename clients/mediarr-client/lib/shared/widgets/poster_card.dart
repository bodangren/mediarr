import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../core/theme/mediarr_theme.dart';
import '../../core/widgets/netflix_scaffold.dart';

/// A poster card showing a media item's cover art with metadata overlay.
///
/// Wrapped in [FocusableAction] for Netflix-style D-pad focus zoom + ring.
class PosterCard extends StatelessWidget {
  const PosterCard({
    super.key,
    required this.title,
    this.posterUrl,
    this.year,
    this.quality,
    this.monitored = false,
    this.hasFile = false,
    this.onPressed,
    this.autofocus = false,
    this.onFocusChange,
  });

  final String title;
  final String? posterUrl;
  final int? year;
  final String? quality;
  final bool monitored;
  final bool hasFile;
  final VoidCallback? onPressed;
  final bool autofocus;

  /// Reports focus entering or leaving this tile, so the host can drive the
  /// D-pad hop from the grid into the header (FR-4).
  final ValueChanged<bool>? onFocusChange;

  @override
  Widget build(BuildContext context) {
    return FocusableAction(
      onSelect: onPressed,
      onFocusChange: onFocusChange,
      autofocus: autofocus,
      borderRadius: 8,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Expanded(
            child: posterUrl != null
                ? CachedNetworkImage(
                    imageUrl: posterUrl!,
                    fit: BoxFit.cover,
                    placeholder: (_, __) => _PosterPlaceholder(title: title),
                    errorWidget: (_, __, ___) =>
                        _PosterPlaceholder(title: title),
                  )
                : _PosterPlaceholder(title: title),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
            color: MediarrColors.surfaceElevated,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    color: MediarrColors.textPrimary,
                    fontSize: 20,
                    fontWeight: FontWeight.w600,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Row(
                  children: [
                    // FR-1: the tile is 165 logical px wide at the TV viewport.
                    // The year absorbs the slack through Expanded and the
                    // badge is capped, so a long quality profile name can
                    // never overflow the card.
                    if (year != null)
                      Expanded(
                        child: Text(
                          '$year',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: MediarrColors.textMuted,
                            fontSize: 15,
                          ),
                        ),
                      )
                    else
                      const Spacer(),
                    if (quality != null) ...[
                      const SizedBox(width: 4),
                      ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 72),
                        child: _QualityBadge(quality: quality!),
                      ),
                    ],
                    const SizedBox(width: 4),
                    _StatusDot(
                      hasFile: hasFile,
                      monitored: monitored,
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _PosterPlaceholder extends StatelessWidget {
  const _PosterPlaceholder({required this.title});
  final String title;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: MediarrColors.surfaceHover,
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.movie, color: MediarrColors.textMuted, size: 40),
            const SizedBox(height: 8),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              child: Text(
                title,
                style: const TextStyle(
                  color: MediarrColors.textMuted,
                  fontSize: 11,
                ),
                textAlign: TextAlign.center,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _QualityBadge extends StatelessWidget {
  const _QualityBadge({required this.quality});
  final String quality;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
      decoration: BoxDecoration(
        color: MediarrColors.accentPrimary.withValues(alpha: 0.2),
        borderRadius: BorderRadius.circular(3),
        border: Border.all(
          color: MediarrColors.accentPrimary.withValues(alpha: 0.4),
        ),
      ),
      child: Text(
        quality,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: const TextStyle(
          color: MediarrColors.accentPrimary,
          fontSize: 12,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}

class _StatusDot extends StatelessWidget {
  const _StatusDot({required this.hasFile, required this.monitored});
  final bool hasFile;
  final bool monitored;

  @override
  Widget build(BuildContext context) {
    final color = hasFile
        ? MediarrColors.statusSuccess
        : monitored
            ? MediarrColors.statusWarning
            : MediarrColors.textMuted;

    return Container(
      width: 8,
      height: 8,
      decoration: BoxDecoration(
        color: color,
        shape: BoxShape.circle,
      ),
    );
  }
}
