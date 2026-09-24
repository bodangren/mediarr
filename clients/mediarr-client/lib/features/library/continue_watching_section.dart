import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/mediarr_theme.dart';
import '../../core/widgets/netflix_scaffold.dart';
import '../../shared/services/api_client.dart';

final continueWatchingProvider = FutureProvider<List<ContinueWatchingItem>>((ref) async {
  final client = ref.read(apiClientProvider.notifier);
  return client.getContinueWatching();
});

class ContinueWatchingSection extends StatelessWidget {
  const ContinueWatchingSection({
    super.key,
    required this.items,
    required this.isLoading,
    required this.onResume,
  });

  final List<ContinueWatchingItem> items;
  final bool isLoading;
  final void Function(ContinueWatchingItem item) onResume;

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return const Padding(
        padding: EdgeInsets.fromLTRB(24, 0, 24, 12),
        child: Row(
          children: [
            Text(
              'Continue Watching',
              style: TextStyle(
                color: MediarrColors.textPrimary,
                fontSize: 28,
                fontWeight: FontWeight.w700,
              ),
            ),
            SizedBox(width: 12),
            SizedBox(
              width: 18,
              height: 18,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: MediarrColors.accentPrimary,
              ),
            ),
          ],
        ),
      );
    }

    if (items.isEmpty) {
      return const SizedBox.shrink();
    }

    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 0, 24, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Continue Watching',
            style: TextStyle(
              color: MediarrColors.textPrimary,
              fontSize: 28,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 300,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: items.length,
              separatorBuilder: (_, __) => const SizedBox(width: 16),
              itemBuilder: (context, index) {
                final item = items[index];
                return SizedBox(
                  width: 460,
                  child: _ContinueWatchingCard(
                    item: item,
                    onSelect: () => onResume(item),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

/// One continue-watching card: artwork with a resume bar, then the labels.
class _ContinueWatchingCard extends StatelessWidget {
  const _ContinueWatchingCard({required this.item, required this.onSelect});

  final ContinueWatchingItem item;
  final VoidCallback onSelect;

  @override
  Widget build(BuildContext context) {
    final progress = item.progress.clamp(0.0, 1.0);
    final image = item.backdropUrl ?? item.posterUrl;
    return FocusableAction(
      onSelect: onSelect,
      borderRadius: 12,
      child: Container(
        decoration: BoxDecoration(
          color: MediarrColors.surfaceCard,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: MediarrColors.borderSubtle),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Stack(
                fit: StackFit.expand,
                children: [
                  if (image != null)
                    CachedNetworkImage(
                      imageUrl: image,
                      fit: BoxFit.cover,
                      placeholder: (_, __) =>
                          Container(color: MediarrColors.surfaceElevated),
                      errorWidget: (_, __, ___) =>
                          Container(color: MediarrColors.surfaceElevated),
                    )
                  else
                    Container(color: MediarrColors.surfaceElevated),
                  // Resume bar over the artwork.
                  Positioned(
                    left: 12,
                    right: 12,
                    bottom: 12,
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: LinearProgressIndicator(
                        value: progress,
                        minHeight: 8,
                        backgroundColor: Colors.black.withValues(alpha: 0.5),
                        valueColor: const AlwaysStoppedAnimation(
                          MediarrColors.accentPrimary,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: MediarrColors.textPrimary,
                      fontSize: 22,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  if (item.episodeTitle != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      _episodeLabel(item),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: MediarrColors.textSecondary,
                        fontSize: 18,
                      ),
                    ),
                  ],
                  const SizedBox(height: 4),
                  Text(
                    '${(progress * 100).round()}% · Resume at ${_formatDuration(Duration(seconds: item.position))}',
                    style: const TextStyle(
                      color: MediarrColors.textMuted,
                      fontSize: 16,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

String _episodeLabel(ContinueWatchingItem item) {
  if (item.episodeTitle == null) {
    return '';
  }

  final season = item.seasonNumber;
  final episode = item.episodeNumber;
  if (season != null && episode != null) {
    final seasonText = season.toString().padLeft(2, '0');
    final episodeText = episode.toString().padLeft(2, '0');
    return 'S${seasonText}E$episodeText · ${item.episodeTitle}';
  }

  return item.episodeTitle!;
}

String _formatDuration(Duration d) {
  final hours = d.inHours;
  final minutes = d.inMinutes.remainder(60).toString().padLeft(2, '0');
  final seconds = d.inSeconds.remainder(60).toString().padLeft(2, '0');
  if (hours > 0) return '$hours:$minutes:$seconds';
  return '$minutes:$seconds';
}
