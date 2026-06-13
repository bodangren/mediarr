import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/mediarr_theme.dart';
import '../../shared/models/subtitle_models.dart';
import '../../shared/services/api_client.dart';

/// Bottom sheet for searching and downloading subtitles.
class SubtitleSearchSheet extends ConsumerStatefulWidget {
  const SubtitleSearchSheet({
    super.key,
    this.movieId,
    this.episodeId,
    this.variantId,
    required this.onDownloaded,
  });

  final int? movieId;
  final int? episodeId;
  final int? variantId;
  final VoidCallback onDownloaded;

  @override
  ConsumerState<SubtitleSearchSheet> createState() =>
      _SubtitleSearchSheetState();
}

class _SubtitleSearchSheetState extends ConsumerState<SubtitleSearchSheet> {
  List<SubtitleSearchResult> _results = const [];
  bool _loading = false;
  String? _error;
  final Set<String> _downloading = {};

  @override
  void initState() {
    super.initState();
    _search();
  }

  Future<void> _search() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final client = ref.read(apiClientProvider.notifier);
      final results = await client.searchSubtitles(
        movieId: widget.movieId,
        episodeId: widget.episodeId,
        variantId: widget.variantId,
      );
      if (mounted) {
        setState(() {
          _results = results;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _loading = false;
        });
      }
    }
  }

  Future<void> _download(SubtitleSearchResult candidate) async {
    final key = '${candidate.languageCode}_${candidate.provider}_${candidate.score}';
    setState(() => _downloading.add(key));

    try {
      final client = ref.read(apiClientProvider.notifier);
      await client.downloadSubtitle(
        candidate: candidate,
        movieId: widget.movieId,
        episodeId: widget.episodeId,
        variantId: widget.variantId,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Downloaded ${candidate.displayLanguage} subtitle'),
            backgroundColor: MediarrColors.statusSuccess,
          ),
        );
        widget.onDownloaded();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Download failed: $e'),
            backgroundColor: MediarrColors.statusError,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _downloading.remove(key));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: MediarrColors.surfaceCard,
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Handle bar
          Container(
            margin: const EdgeInsets.only(top: 12),
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: MediarrColors.textMuted.withValues(alpha: 0.3),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          // Header
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Text(
                  'Search Subtitles',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const Spacer(),
                IconButton(
                  icon: const Icon(Icons.refresh),
                  onPressed: _loading ? null : _search,
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          // Content
          Flexible(
            child: _buildContent(),
          ),
        ],
      ),
    );
  }

  Widget _buildContent() {
    if (_loading) {
      return const SizedBox(
        height: 200,
        child: Center(
          child: CircularProgressIndicator(
            color: MediarrColors.accentPrimary,
          ),
        ),
      );
    }

    if (_error != null) {
      return SizedBox(
        height: 200,
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.error,
                color: MediarrColors.statusError,
                size: 48,
              ),
              const SizedBox(height: 12),
              Text(
                'Search failed',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 8),
              Text(
                _error!,
                style: const TextStyle(color: MediarrColors.textMuted),
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: _search,
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    if (_results.isEmpty) {
      return const SizedBox(
        height: 200,
        child: Center(
          child: Text(
            'No subtitles found',
            style: TextStyle(color: MediarrColors.textMuted),
          ),
        ),
      );
    }

    return ListView.builder(
      shrinkWrap: true,
      padding: const EdgeInsets.all(16),
      itemCount: _results.length,
      itemBuilder: (context, index) {
        final result = _results[index];
        final key = '${result.languageCode}_${result.provider}_${result.score}';
        final isDownloading = _downloading.contains(key);

        return Card(
          color: MediarrColors.surfaceHover,
          margin: const EdgeInsets.only(bottom: 8),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                // Language flag/icon
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: MediarrColors.accentPrimary.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(
                    Icons.subtitles,
                    color: MediarrColors.accentPrimary,
                  ),
                ),
                const SizedBox(width: 12),
                // Info
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        result.displayLabel,
                        style: const TextStyle(
                          color: MediarrColors.textPrimary,
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          _MetadataChip(label: result.provider),
                          const SizedBox(width: 8),
                          _MetadataChip(
                            label: 'Score: ${result.score.toStringAsFixed(0)}',
                          ),
                        ],
                      ),
                      if (result.releaseName != null) ...[
                        const SizedBox(height: 4),
                        Text(
                          result.releaseName!,
                          style: const TextStyle(
                            color: MediarrColors.textMuted,
                            fontSize: 12,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ],
                  ),
                ),
                // Download button
                ElevatedButton.icon(
                  onPressed: isDownloading ? null : () => _download(result),
                  icon: isDownloading
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Icon(Icons.download, size: 18),
                  label: Text(isDownloading ? '...' : 'Download'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: MediarrColors.accentPrimary,
                    foregroundColor: Colors.white,
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _MetadataChip extends StatelessWidget {
  const _MetadataChip({required this.label});
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: MediarrColors.textMuted.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: MediarrColors.textSecondary,
          fontSize: 12,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }
}
