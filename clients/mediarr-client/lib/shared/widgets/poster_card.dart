import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:mediarr_client/shared/services/api_config.dart';

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

  /// Whether the quality label says anything. The API falls back to the
  /// quality profile name, whose default is the meaningless "Any".
  bool get _hasMeaningfulQuality {
    final value = quality?.trim();
    if (value == null || value.isEmpty) return false;
    return value.toLowerCase() != 'any' && value.toLowerCase() != 'unknown';
  }
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
                    imageUrl: ApiConfig.image(posterUrl!),
                    fit: BoxFit.cover,
                    placeholder: (_, __) => PosterPlaceholder(title: title),
                    errorWidget: (_, __, ___) =>
                        PosterPlaceholder(title: title),
                  )
                : PosterPlaceholder(title: title),
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
                    // A series row carries no year (the API returns 0), and a
                    // movie's quality often falls back to the profile name
                    // "Any". Rendering either is noise that made the tile look
                    // broken (10-foot UX review 2026-11-07).
                    if (year != null && year! > 0)
                      Expanded(
                        child: Text(
                          '$year',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: MediarrColors.textMuted,
                            fontSize: 18,
                          ),
                        ),
                      )
                    else
                      const Spacer(),
                    if (_hasMeaningfulQuality)
                      ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 64),
                        child: _QualityBadge(quality: quality!),
                      ),
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

/// Tile artwork for a title with no poster.
///
/// A flat grey rectangle with a film icon made missing artwork look like a
/// loading failure (several tiles in the owner's library have no poster). The
/// placeholder now derives a stable dark gradient from the title and shows its
/// initial, so a posterless library still reads as a designed grid
/// (10-foot UX review 2026-11-07).
class PosterPlaceholder extends StatelessWidget {
  const PosterPlaceholder({super.key, required this.title});
  final String title;

  static const _palette = <(Color, Color)>[
    (Color(0xFF2A3A55), Color(0xFF141A24)),
    (Color(0xFF3A2A45), Color(0xFF1A141F)),
    (Color(0xFF243A38), Color(0xFF121D1C)),
    (Color(0xFF3E3324), Color(0xFF1E1912)),
    (Color(0xFF2C2F45), Color(0xFF15161F)),
  ];

  String get _initial {
    final trimmed = title.trim();
    if (trimmed.isEmpty) return '?';
    // Skip a leading article so "The Boys" reads as B, not T.
    final withoutArticle = trimmed.replaceFirst(
      RegExp(r'^(the|a|an)\s+', caseSensitive: false),
      '',
    );
    final source = withoutArticle.isEmpty ? trimmed : withoutArticle;
    return source.characters.first.toUpperCase();
  }

  int get _paletteIndex {
    var hash = 0;
    for (final unit in title.codeUnits) {
      hash = (hash * 31 + unit) & 0x7fffffff;
    }
    return hash % _palette.length;
  }

  @override
  Widget build(BuildContext context) {
    final colours = _palette[_paletteIndex];
    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [colours.$1, colours.$2],
        ),
      ),
      child: Center(
        child: Text(
          _initial,
          style: TextStyle(
            color: Colors.white.withValues(alpha: 0.30),
            fontSize: 56,
            fontWeight: FontWeight.w800,
          ),
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
