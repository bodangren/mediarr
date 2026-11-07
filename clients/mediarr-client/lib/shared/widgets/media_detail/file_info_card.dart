import 'package:flutter/material.dart';

import '../../../core/theme/mediarr_theme.dart';

class FileInfoCard extends StatelessWidget {
  const FileInfoCard({
    super.key,
    this.quality,
    this.path,
    this.sizeBytes,
    this.audioTrackCount,
    this.subtitleTrackCount,
  });

  final String? quality;
  final String? path;
  final int? sizeBytes;
  final int? audioTrackCount;
  final int? subtitleTrackCount;

  @override
  Widget build(BuildContext context) {
    final hasSize = sizeBytes != null && sizeBytes! > 0;
    final hasAny = quality != null ||
        path != null ||
        hasSize ||
        audioTrackCount != null ||
        subtitleTrackCount != null;

    if (!hasAny) {
      return const SizedBox.shrink();
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Quality badge. The API falls back to the quality-profile name,
            // whose default is the meaningless "Any" — the same noise that was
            // removed from poster tiles (device capture 2026-11-08).
            if (_hasMeaningfulQuality)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: _QualityBadge(quality: quality!),
              ),
            // File path
            if (path != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Text(
                  path!,
                  style: Theme.of(context).textTheme.bodySmall,
                  overflow: TextOverflow.ellipsis,
                  maxLines: 2,
                ),
              ),
            // Size
            if (sizeBytes != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Text(
                  _formatSize(sizeBytes!),
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
              ),
            // Audio / subtitle track summary
            if (audioTrackCount != null || subtitleTrackCount != null)
              Text(
                _trackSummary(),
                style: Theme.of(context).textTheme.bodySmall,
              ),
          ],
        ),
      ),
    );
  }

  String _formatSize(int bytes) {
    if (bytes >= 1024 * 1024 * 1024) {
      final gb = bytes / (1024 * 1024 * 1024);
      return '${gb.toStringAsFixed(gb == gb.roundToDouble() ? 0 : 1)} GB';
    } else if (bytes >= 1024 * 1024) {
      final mb = bytes / (1024 * 1024);
      return '${mb.toStringAsFixed(mb == mb.roundToDouble() ? 0 : 1)} MB';
    }
    return '$bytes B';
  }

  String _trackSummary() {
    final parts = <String>[];
    if (audioTrackCount != null) {
      parts.add('$audioTrackCount audio');
    }
    if (subtitleTrackCount != null) {
      parts.add('$subtitleTrackCount subtitle');
    }
    return parts.join(' \u00B7 ');
  }

  bool get _hasMeaningfulQuality {
    final value = quality?.trim();
    if (value == null || value.isEmpty) return false;
    final lower = value.toLowerCase();
    return lower != 'any' && lower != 'unknown';
  }
}

class _QualityBadge extends StatelessWidget {
  const _QualityBadge({required this.quality});
  final String quality;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: MediarrColors.accentPrimary.withValues(alpha: 0.2),
        borderRadius: BorderRadius.circular(4),
        border: Border.all(
          color: MediarrColors.accentPrimary.withValues(alpha: 0.4),
        ),
      ),
      child: Text(
        quality,
        style: const TextStyle(
          color: MediarrColors.accentPrimary,
          fontSize: 11,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}
