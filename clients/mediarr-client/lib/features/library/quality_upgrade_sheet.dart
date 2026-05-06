import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/mediarr_theme.dart';
import '../../shared/models/search_result.dart';
import '../../shared/services/api_client.dart';

/// Bottom sheet for searching and grabbing quality upgrades.
class QualityUpgradeSheet extends ConsumerStatefulWidget {
  const QualityUpgradeSheet({
    super.key,
    this.query,
    this.type,
    this.tmdbId,
    this.tvdbId,
    this.year,
    this.qualityProfileId,
    required this.currentQuality,
    required this.onGrabbed,
  });

  final String? query;
  final String? type;
  final int? tmdbId;
  final int? tvdbId;
  final int? year;
  final int? qualityProfileId;
  final String? currentQuality;
  final VoidCallback onGrabbed;

  @override
  ConsumerState<QualityUpgradeSheet> createState() =>
      _QualityUpgradeSheetState();
}

class _QualityUpgradeSheetState extends ConsumerState<QualityUpgradeSheet> {
  List<Release> _results = const [];
  bool _loading = false;
  String? _error;
  final Set<String> _grabbing = {};

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
      final results = await client.searchReleases(
        query: widget.query,
        type: widget.type,
        tmdbId: widget.tmdbId,
        tvdbId: widget.tvdbId,
        year: widget.year,
        qualityProfileId: widget.qualityProfileId,
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

  Future<void> _grab(Release release) async {
    final key = release.guid;
    setState(() => _grabbing.add(key));

    try {
      final client = ref.read(apiClientProvider.notifier);
      await client.grabRelease(
        guid: release.guid,
        indexerId: release.indexerId,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Grabbed ${release.title}'),
            backgroundColor: MediarrColors.statusSuccess,
          ),
        );
        widget.onGrabbed();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Grab failed: $e'),
            backgroundColor: MediarrColors.statusError,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _grabbing.remove(key));
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
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Quality Upgrade',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    if (widget.currentQuality != null)
                      Text(
                        'Current: ${widget.currentQuality}',
                        style: const TextStyle(
                          color: MediarrColors.textMuted,
                          fontSize: 13,
                        ),
                      ),
                  ],
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
            'No upgrade releases found',
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
        final release = _results[index];
        final isGrabbing = _grabbing.contains(release.guid);

        return Card(
          color: MediarrColors.surfaceHover,
          margin: const EdgeInsets.only(bottom: 8),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                // Quality icon
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: MediarrColors.accentPrimary.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(
                    Icons.upgrade,
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
                        release.title,
                        style: const TextStyle(
                          color: MediarrColors.textPrimary,
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          if (release.quality != null)
                            _MetadataChip(
                              label: release.quality!,
                              color: MediarrColors.accentPrimary,
                            ),
                          const SizedBox(width: 8),
                          _MetadataChip(
                            label: release.indexerName ?? 'Unknown',
                          ),
                          const SizedBox(width: 8),
                          if (release.size != null)
                            _MetadataChip(
                              label: _formatSize(release.size!),
                            ),
                        ],
                      ),
                      if (release.seeders != null) ...[
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            Icon(
                              Icons.arrow_upward,
                              size: 12,
                              color: MediarrColors.statusSuccess,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              '${release.seeders}',
                              style: const TextStyle(
                                color: MediarrColors.statusSuccess,
                                fontSize: 12,
                              ),
                            ),
                            if (release.leechers != null) ...[
                              const SizedBox(width: 12),
                              Icon(
                                Icons.arrow_downward,
                                size: 12,
                                color: MediarrColors.statusInfo,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                '${release.leechers}',
                                style: const TextStyle(
                                  color: MediarrColors.statusInfo,
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
                // Grab button
                ElevatedButton.icon(
                  onPressed: isGrabbing ? null : () => _grab(release),
                  icon: isGrabbing
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Icon(Icons.download, size: 18),
                  label: Text(isGrabbing ? '...' : 'Grab'),
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

  String _formatSize(int bytes) {
    if (bytes >= 1073741824) {
      return '${(bytes / 1073741824).toStringAsFixed(1)} GB';
    } else if (bytes >= 1048576) {
      return '${(bytes / 1048576).toStringAsFixed(0)} MB';
    }
    return '$bytes B';
  }
}

class _MetadataChip extends StatelessWidget {
  const _MetadataChip({required this.label, this.color});
  final String label;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: (color ?? MediarrColors.textMuted).withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color ?? MediarrColors.textSecondary,
          fontSize: 12,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }
}
