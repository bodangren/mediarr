import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/mediarr_theme.dart';
import '../../core/widgets/netflix_scaffold.dart';
import '../../shared/models/subtitle_coverage.dart';
import '../../shared/services/api_client.dart';

final subtitleCoverageProvider = FutureProvider<SubtitleCoverage?>((ref) async {
  return ref.read(apiClientProvider.notifier).getSubtitleCoverage();
});

final priorityCoverageProvider = FutureProvider<PriorityCoverage?>((ref) async {
  return ref.read(apiClientProvider.notifier).getPriorityCoverage();
});

/// Living-room view of subtitle coverage: the same numbers the SPA wanted page and the server report,
/// grouped by viewing priority, so the owner can see in the living room which of their watching list
/// lacks dual-language subtitles (and why: providers are disabled until a key is configured).
class WantedScreen extends ConsumerWidget {
  const WantedScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final coverage = ref.watch(subtitleCoverageProvider);
    final priority = ref.watch(priorityCoverageProvider);

    return NetflixScaffold(
      child: Container(
        color: MediarrColors.surfaceBase,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 16, 0, 0),
              child: FocusableAction(
                autofocus: true,
                variant: FocusableActionVariant.button,
                onSelect: () => Navigator.of(context).maybePop(),
                borderRadius: 8,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                  color: MediarrColors.surfaceCard,
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.arrow_back, size: 28, color: MediarrColors.textPrimary),
                      SizedBox(width: 8),
                      Text(
                        'Back',
                        style: TextStyle(
                          color: MediarrColors.textPrimary,
                          fontSize: 20,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 12, 24, 8),
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
                AsyncData(:final value) when value != null && value.buckets.isNotEmpty => _BucketList(
                    buckets: value.buckets,
                    attention: (priority.valueOrNull?.items ?? const <PriorityCoverageItem>[])
                        .where((item) => !item.hasBoth)
                        .toList(growable: false),
                  ),
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
  const _BucketList({required this.buckets, required this.attention});

  final List<SubtitleCoverageBucket> buckets;
  final List<PriorityCoverageItem> attention;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
      children: [
        for (final bucket in buckets) ...[
          _BucketRow(bucket: bucket),
          const SizedBox(height: 10),
        ],
        if (attention.isNotEmpty) ...[
          const SizedBox(height: 8),
          const Text(
            'Needs attention',
            style: TextStyle(color: MediarrColors.textPrimary, fontSize: 20, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 8),
          for (final item in attention) _AttentionRow(item: item),
        ],
      ],
    );
  }
}

class _BucketRow extends StatelessWidget {
  const _BucketRow({required this.bucket});

  final SubtitleCoverageBucket bucket;

  @override
  Widget build(BuildContext context) {
    final ratio = bucket.total == 0 ? 0.0 : bucket.withBoth / bucket.total;
    return Container(
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
        );
  }
}

class _AttentionRow extends StatelessWidget {
  const _AttentionRow({required this.item});

  final PriorityCoverageItem item;

  @override
  Widget build(BuildContext context) {
    final warning = item.status == 'none';
    return Container(
        margin: const EdgeInsets.only(bottom: 6),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: MediarrColors.surfaceCard,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: warning ? const Color(0xFF7F1D1D) : MediarrColors.borderSubtle,
          ),
        ),
        child: Row(
          children: [
            Expanded(
              child: Text(
                item.title,
                style: const TextStyle(color: MediarrColors.textPrimary, fontSize: 17),
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const SizedBox(width: 12),
            Text(
              item.reason,
              style: TextStyle(
                color: warning ? const Color(0xFFFCA5A5) : const Color(0xFFFCD34D),
                fontSize: 15,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
    );
  }
}

class _Message extends StatelessWidget {
  const _Message(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    // A message-only state used to leave the screen with no focusable control,
    // so the D-pad had nothing to land on and the viewer appeared locked out
    // (owner report 2026-11-17: "it errors and then I can't exit using the dpad").
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          FocusableAction(
            autofocus: true,
            variant: FocusableActionVariant.button,
            onSelect: () => Navigator.of(context).maybePop(),
            borderRadius: 8,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              color: MediarrColors.surfaceCard,
              child: const Text(
                'Back',
                style: TextStyle(
                  color: MediarrColors.textPrimary,
                  fontSize: 20,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text(text, style: const TextStyle(color: MediarrColors.textMuted, fontSize: 16)),
        ],
      ),
    );
  }
}
