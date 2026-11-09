import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/mediarr_theme.dart';
import '../../core/widgets/netflix_scaffold.dart';
import '../../shared/models/subtitle_coverage.dart';
import '../../shared/services/api_client.dart';

final subtitleCoverageProvider = FutureProvider<SubtitleCoverage?>((ref) async {
  return ref.read(apiClientProvider.notifier).getSubtitleCoverage();
});

/// Living-room view of subtitle coverage: the same numbers the SPA wanted page and the server report,
/// grouped by viewing priority, so the owner can see in the living room which of their watching list
/// lacks dual-language subtitles (and why: providers are disabled until a key is configured).
class WantedScreen extends ConsumerWidget {
  const WantedScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final coverage = ref.watch(subtitleCoverageProvider);

    return NetflixScaffold(
      child: Container(
        color: MediarrColors.surfaceBase,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 16, 24, 8),
              child: Row(
                children: [
                  const Text(
                    'Subtitle coverage',
                    style: TextStyle(
                      color: MediarrColors.textPrimary,
                      fontSize: 28,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Flexible(
                    child: Text(
                      coverage.valueOrNull == null
                          ? 'Watching list vs. EN+ZH availability'
                          : '${coverage.valueOrNull!.withBoth} of ${coverage.valueOrNull!.total} items have EN+ZH',
                      style: const TextStyle(color: MediarrColors.textSecondary, fontSize: 16),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ),
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 24),
              child: Text(
                'Only the priority list is measured: continue-watching, recent, new and backfill. '
                'Fetching missing subtitles needs a provider API key in Settings.',
                style: TextStyle(color: MediarrColors.textMuted, fontSize: 14),
              ),
            ),
            const SizedBox(height: 12),
            Expanded(
              child: switch (coverage) {
                AsyncData(:final value) when value != null && value.buckets.isNotEmpty => _BucketList(buckets: value.buckets),
                AsyncData() => const _Message('No coverage data yet — the server has not reported any buckets.'),
                AsyncError(:final error) => _Message('Could not load coverage: $error'),
                _ => const Center(child: CircularProgressIndicator()),
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _BucketList extends StatelessWidget {
  const _BucketList({required this.buckets});

  final List<SubtitleCoverageBucket> buckets;

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
      itemCount: buckets.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (context, index) {
        final bucket = buckets[index];
        final ratio = bucket.total == 0 ? 0.0 : bucket.withBoth / bucket.total;
        return FocusableAction(
          autofocus: index == 0,
          borderRadius: 10,
          onSelect: () {},
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
            decoration: BoxDecoration(
              color: MediarrColors.surfaceCard,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: MediarrColors.borderSubtle),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    SizedBox(
                      width: 220,
                      child: Text(
                        bucket.label,
                        style: const TextStyle(
                          color: MediarrColors.textPrimary,
                          fontSize: 20,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    Expanded(
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(4),
                        child: LinearProgressIndicator(
                          value: ratio,
                          minHeight: 8,
                          backgroundColor: MediarrColors.surfaceElevated,
                          valueColor: AlwaysStoppedAnimation(
                            ratio >= 0.9
                                ? const Color(0xFF22C55E)
                                : ratio >= 0.5
                                    ? const Color(0xFFF59E0B)
                                    : const Color(0xFFEF4444),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 16),
                    SizedBox(
                      width: 120,
                      child: Text(
                        '${bucket.withBoth}/${bucket.total} EN+ZH',
                        textAlign: TextAlign.right,
                        style: const TextStyle(color: MediarrColors.textSecondary, fontSize: 15),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  '${bucket.missingChinese} without Chinese · ${bucket.missingBoth} without either language',
                  style: TextStyle(color: MediarrColors.textMuted, fontSize: 14),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _Message extends StatelessWidget {
  const _Message(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Text(text, style: TextStyle(color: MediarrColors.textMuted, fontSize: 16)),
    );
  }
}
