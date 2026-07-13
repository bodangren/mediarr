import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/mediarr_theme.dart';
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
                fontSize: 18,
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
              fontSize: 18,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8),
          SizedBox(
            height: 150,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: items.length,
              separatorBuilder: (_, __) => const SizedBox(width: 12),
              itemBuilder: (context, index) {
                final item = items[index];
                final progress = item.progress.clamp(0.0, 1.0);
                return SizedBox(
                  width: 320,
                  child: InkWell(
                    onTap: () => onResume(item),
                    borderRadius: BorderRadius.circular(10),
                    child: Ink(
                      decoration: BoxDecoration(
                        color: MediarrColors.surfaceCard,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: MediarrColors.borderSubtle),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              item.title,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                color: MediarrColors.textPrimary,
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            if (item.episodeTitle != null) ...[
                              const SizedBox(height: 2),
                              Text(
                                _episodeLabel(item),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  color: MediarrColors.textSecondary,
                                  fontSize: 12,
                                ),
                              ),
                            ],
                            const Spacer(),
                            ClipRRect(
                              borderRadius: BorderRadius.circular(4),
                              child: LinearProgressIndicator(
                                value: progress,
                                minHeight: 7,
                                backgroundColor: MediarrColors.surfaceHover,
                                valueColor: const AlwaysStoppedAnimation(
                                  MediarrColors.accentPrimary,
                                ),
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              '${(progress * 100).round()}% · Resume at ${_formatDuration(Duration(seconds: item.position))}',
                              style: const TextStyle(
                                color: MediarrColors.textMuted,
                                fontSize: 11,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
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
