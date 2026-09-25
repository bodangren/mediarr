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
                fontSize: 20,
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
              fontSize: 20,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8),
          LayoutBuilder(
            builder: (context, constraints) {
              const gap = 12.0;
              // FR-14: four cards exactly fill the row (the mockup). The
              // floor only protects degenerate test widths.
              final cardWidth =
                  ((constraints.maxWidth - gap * 3) / 4).clamp(120.0, 640.0);
              // Art is about 16:7 (the mockup); the text block below it is
              // fixed, so the art absorbs the remainder via Expanded.
              final cardHeight = cardWidth / 2.2 + 68;
              return SizedBox(
                height: cardHeight,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: items.length,
                  separatorBuilder: (_, __) => const SizedBox(width: gap),
                  itemBuilder: (context, index) {
                    final item = items[index];
                    return SizedBox(
                      width: cardWidth,
                      child: _ContinueWatchingCard(
                        item: item,
                        onSelect: () => onResume(item),
                      ),
                    );
                  },
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}

/// One continue-watching card (owner mockup 2026-09-24): 16:9 artwork, then a
/// progress bar with the percent at its right edge, then the title, then the
/// `Resume at mm:ss` line. Select resumes playback.
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
      focusPadding: 4,
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
              child: ClipRRect(
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(12),
                ),
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
                    const DecoratedBox(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [Colors.transparent, Color(0xCC000000)],
                          stops: [0.35, 1.0],
                        ),
                      ),
                    ),
                    Positioned(
                      left: 10,
                      right: 10,
                      bottom: 8,
                      child: Row(
                        children: [
                          Expanded(
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(3),
                              child: LinearProgressIndicator(
                                value: progress,
                                minHeight: 5,
                                backgroundColor:
                                    Colors.white.withValues(alpha: 0.24),
                                valueColor: const AlwaysStoppedAnimation(
                                  MediarrColors.accentPrimary,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            '${(progress * 100).round()}%',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              shadows: [Shadow(blurRadius: 4, color: Colors.black)],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 6, 12, 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: MediarrColors.textPrimary,
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 1),
                  Text(
                    'Resume at ${_formatDuration(Duration(seconds: item.position))}',
                    style: const TextStyle(
                      color: MediarrColors.textMuted,
                      fontSize: 13,
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

String _formatDuration(Duration d) {
  final hours = d.inHours;
  final minutes = d.inMinutes.remainder(60).toString().padLeft(2, '0');
  final seconds = d.inSeconds.remainder(60).toString().padLeft(2, '0');
  if (hours > 0) return '$hours:$minutes:$seconds';
  return '$minutes:$seconds';
}
