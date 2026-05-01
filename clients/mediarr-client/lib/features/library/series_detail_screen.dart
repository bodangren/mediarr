import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/mediarr_theme.dart';
import '../../shared/models/episode.dart';
import '../../shared/models/season.dart';
import '../../shared/models/series.dart';
import '../../shared/services/api_client.dart';
import '../playback/playback_screen.dart';
import 'quality_upgrade_sheet.dart';
import 'subtitle_search_sheet.dart';

/// Series detail view with seasons and episodes.
class SeriesDetailScreen extends ConsumerStatefulWidget {
  const SeriesDetailScreen({super.key, required this.series});

  final Series series;

  @override
  ConsumerState<SeriesDetailScreen> createState() =>
      _SeriesDetailScreenState();
}

class _SeriesDetailScreenState extends ConsumerState<SeriesDetailScreen> {
  Series? _detail;
  bool _loading = true;
  String? _error;
  int? _expandedSeasonNumber;

  @override
  void initState() {
    super.initState();
    _loadDetail();
  }

  Future<void> _loadDetail() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final client = ref.read(apiClientProvider.notifier);
      final detail = await client.getSeriesDetail(widget.series.id);
      if (!mounted) return;
      setState(() {
        _detail = detail;
        _loading = false;
        // Auto-expand the first season that has episodes
        if (detail != null && detail.seasons.isNotEmpty) {
          _expandedSeasonNumber = detail.seasons.first.seasonNumber;
        }
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final series = _detail ?? widget.series;

    return Scaffold(
      body: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Poster sidebar
          SizedBox(
            width: 300,
            child: series.posterUrl != null
                ? CachedNetworkImage(
                    imageUrl: series.posterUrl!,
                    fit: BoxFit.cover,
                    height: double.infinity,
                  )
                : Container(
                    color: MediarrColors.surfaceHover,
                    child: const Center(
                      child: Icon(Icons.tv,
                          size: 80, color: MediarrColors.textMuted),
                    ),
                  ),
          ),
          // Details
          Expanded(
            child: _loading
                ? const Center(
                    child: CircularProgressIndicator(
                      color: MediarrColors.accentPrimary,
                    ),
                  )
                : _error != null
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.error,
                                color: MediarrColors.statusError, size: 48),
                            const SizedBox(height: 12),
                            Text('Failed to load series detail',
                                style: Theme.of(context)
                                    .textTheme
                                    .titleMedium),
                            const SizedBox(height: 8),
                            Text(_error!,
                                style: const TextStyle(
                                    color: MediarrColors.textMuted)),
                            const SizedBox(height: 16),
                            ElevatedButton(
                              onPressed: _loadDetail,
                              child: const Text('Retry'),
                            ),
                          ],
                        ),
                      )
                    : _buildContent(context, series),
          ),
        ],
      ),
    );
  }

  Widget _buildContent(BuildContext context, Series series) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Back button and title
          Row(
            children: [
              IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: () => Navigator.of(context).pop(),
                autofocus: true,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  series.title,
                  style: Theme.of(context).textTheme.headlineLarge,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),

          // Metadata chips
          Wrap(
            spacing: 8,
            runSpacing: 4,
            children: [
              if (series.year != null) _MetadataChip(label: '${series.year}'),
              if (series.network != null)
                _MetadataChip(label: series.network!),
              if (series.status != null)
                _MetadataChip(
                  label: series.status!,
                  color: _statusColor(series.status!),
                ),
              _MetadataChip(
                label: series.monitored ? 'Monitored' : 'Unmonitored',
                color: series.monitored
                    ? MediarrColors.statusSuccess
                    : MediarrColors.textMuted,
              ),
              if (series.episodeFileCount != null &&
                  series.episodeCount != null)
                _MetadataChip(
                  label:
                      '${series.episodeFileCount}/${series.episodeCount} episodes',
                ),
              if (series.sizeOnDisk != null && series.sizeOnDisk! > 0)
                _MetadataChip(label: _formatSize(series.sizeOnDisk!)),
            ],
          ),
          const SizedBox(height: 16),

          // Overview
          if (series.overview != null && series.overview!.isNotEmpty) ...[
            Text(series.overview!,
                style: Theme.of(context).textTheme.bodyLarge),
            const SizedBox(height: 24),
          ],

          // Seasons
          if (series.seasons.isNotEmpty) ...[
            Text('Seasons',
                style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 12),
            ...series.seasons.map((season) => _SeasonTile(
                  season: season,
                  isExpanded:
                      _expandedSeasonNumber == season.seasonNumber,
                  onToggle: () {
                    setState(() {
                      _expandedSeasonNumber =
                          _expandedSeasonNumber == season.seasonNumber
                              ? null
                              : season.seasonNumber;
                    });
                  },
                  onPlayEpisode: (episode) =>
                      _playEpisode(episode, season),
                  onSearchSubtitles: (episode) => _showSubtitleSearch(episode),
                  onQualityUpgrade: (episode) => _showQualityUpgrade(episode),
                )),
          ] else ...[
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 24),
              child: Text('No season data available',
                  style: TextStyle(color: MediarrColors.textMuted)),
            ),
          ],
        ],
      ),
    );
  }

  void _showSubtitleSearch(Episode episode) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => SubtitleSearchSheet(
        episodeId: episode.id,
        onDownloaded: () {},
      ),
    );
  }

  void _showQualityUpgrade(Episode episode) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => QualityUpgradeSheet(
        query: '${widget.series.title} S${episode.seasonNumber.toString().padLeft(2, '0')}E${episode.episodeNumber.toString().padLeft(2, '0')}',
        type: 'episode',
        currentQuality: episode.quality,
        onGrabbed: () {},
      ),
    );
  }

  void _playEpisode(Episode episode, Season season) {
    if (!episode.hasFile) return;

    final apiClient = ref.read(apiClientProvider.notifier);
    final streamUrl = apiClient.getStreamUrl(episode.id, 'episode');

    // Find the next episode for the "next" button
    final episodes = season.episodes;
    final currentIndex =
        episodes.indexWhere((e) => e.id == episode.id);
    final hasNext =
        currentIndex >= 0 && currentIndex < episodes.length - 1;

    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => PlaybackScreen(
          streamUrl: streamUrl,
          title:
              '${widget.series.title} - S${episode.seasonNumber.toString().padLeft(2, '0')}E${episode.episodeNumber.toString().padLeft(2, '0')} - ${episode.title ?? 'Episode ${episode.episodeNumber}'}',
          mediaId: episode.id,
          mediaType: 'episode',
          nextEpisode: hasNext
              ? () {
                  Navigator.of(context).pop();
                  _playEpisode(episodes[currentIndex + 1], season);
                }
              : null,
        ),
      ),
    );
  }

  Color _statusColor(String status) {
    switch (status.toLowerCase()) {
      case 'continuing':
        return MediarrColors.statusSuccess;
      case 'ended':
        return MediarrColors.textMuted;
      case 'upcoming':
        return MediarrColors.statusInfo;
      default:
        return MediarrColors.textSecondary;
    }
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

/// A single season with expandable episode list.
class _SeasonTile extends StatelessWidget {
  const _SeasonTile({
    required this.season,
    required this.isExpanded,
    required this.onToggle,
    required this.onPlayEpisode,
    this.onSearchSubtitles,
    this.onQualityUpgrade,
  });

  final Season season;
  final bool isExpanded;
  final VoidCallback onToggle;
  final void Function(Episode) onPlayEpisode;
  final void Function(Episode)? onSearchSubtitles;
  final void Function(Episode)? onQualityUpgrade;

  @override
  Widget build(BuildContext context) {
    final fileCount = season.episodeFileCount ?? 0;
    final totalCount = season.episodeCount ?? season.episodes.length;
    final label = season.seasonNumber == 0
        ? 'Specials'
        : 'Season ${season.seasonNumber}';

    return Card(
      color: MediarrColors.surfaceCard,
      margin: const EdgeInsets.only(bottom: 4),
      child: Column(
        children: [
          // Season header
          InkWell(
            onTap: onToggle,
            child: Padding(
              padding:
                  const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Row(
                children: [
                  Icon(
                    isExpanded
                        ? Icons.expand_less
                        : Icons.expand_more,
                    color: MediarrColors.textSecondary,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    label,
                    style: const TextStyle(
                      color: MediarrColors.textPrimary,
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const Spacer(),
                  // Episode count badge
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: fileCount == totalCount && totalCount > 0
                          ? MediarrColors.statusSuccess
                              .withValues(alpha: 0.15)
                          : MediarrColors.textMuted
                              .withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      '$fileCount / $totalCount',
                      style: TextStyle(
                        color: fileCount == totalCount && totalCount > 0
                            ? MediarrColors.statusSuccess
                            : MediarrColors.textMuted,
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          // Episode list
          if (isExpanded && season.episodes.isNotEmpty)
            ...season.episodes.map((ep) => _EpisodeRow(
                  episode: ep,
                  onPlay: () => onPlayEpisode(ep),
                  onSearchSubtitles: onSearchSubtitles != null
                      ? () => onSearchSubtitles!(ep)
                      : null,
                  onQualityUpgrade: onQualityUpgrade != null
                      ? () => onQualityUpgrade!(ep)
                      : null,
                )),
          if (isExpanded && season.episodes.isEmpty)
            const Padding(
              padding: EdgeInsets.all(16),
              child: Text(
                'No episode data available',
                style: TextStyle(
                    color: MediarrColors.textMuted, fontSize: 13),
              ),
            ),
        ],
      ),
    );
  }
}

/// A single episode row.
class _EpisodeRow extends StatelessWidget {
  const _EpisodeRow({
    required this.episode,
    required this.onPlay,
    this.onSearchSubtitles,
    this.onQualityUpgrade,
  });

  final Episode episode;
  final VoidCallback onPlay;
  final VoidCallback? onSearchSubtitles;
  final VoidCallback? onQualityUpgrade;

  @override
  Widget build(BuildContext context) {
    final epNum = episode.episodeNumber.toString().padLeft(2, '0');
    final title = episode.title ?? 'Episode ${episode.episodeNumber}';

    final statusColor = episode.hasFile
        ? MediarrColors.statusSuccess
        : episode.monitored
            ? MediarrColors.statusWarning
            : MediarrColors.textMuted;

    return InkWell(
      onTap: episode.hasFile ? onPlay : null,
      child: Container(
        decoration: BoxDecoration(
          border: Border(
            top: BorderSide(
              color: MediarrColors.borderSubtle.withValues(alpha: 0.3),
            ),
          ),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        child: Row(
          children: [
            // Status dot
            Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(
                color: statusColor,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 12),
            // Episode number
            SizedBox(
              width: 36,
              child: Text(
                epNum,
                style: const TextStyle(
                  color: MediarrColors.textMuted,
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
            // Title
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      color: episode.hasFile
                          ? MediarrColors.textPrimary
                          : MediarrColors.textSecondary,
                      fontSize: 14,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (episode.airDateUtc != null)
                    Text(
                      _formatAirDate(episode.airDateUtc!),
                      style: const TextStyle(
                        color: MediarrColors.textMuted,
                        fontSize: 11,
                      ),
                    ),
                ],
              ),
            ),
            // Quality badge
            if (episode.quality != null) ...[
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color:
                      MediarrColors.accentPrimary.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  episode.quality!,
                  style: const TextStyle(
                    color: MediarrColors.accentPrimary,
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const SizedBox(width: 8),
            ],
            // Playback progress
            if (episode.playbackState != null &&
                episode.playbackState!.progress > 0 &&
                !episode.playbackState!.isWatched) ...[
              SizedBox(
                width: 40,
                child: LinearProgressIndicator(
                  value: episode.playbackState!.progress.clamp(0.0, 1.0),
                  backgroundColor: MediarrColors.textMuted.withValues(alpha: 0.2),
                  color: MediarrColors.accentPrimary,
                  minHeight: 3,
                ),
              ),
              const SizedBox(width: 8),
            ],
            if (episode.playbackState != null &&
                episode.playbackState!.isWatched)
              const Padding(
                padding: EdgeInsets.only(right: 8),
                child: Icon(Icons.check_circle,
                    color: MediarrColors.statusSuccess, size: 16),
              ),
            // Subtitle button
            if (episode.hasFile && onSearchSubtitles != null) ...[
              IconButton(
                icon: const Icon(Icons.subtitles, color: MediarrColors.textSecondary, size: 18),
                onPressed: onSearchSubtitles,
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
              ),
              const SizedBox(width: 4),
            ],
            // Quality upgrade button
            if (episode.hasFile && onQualityUpgrade != null) ...[
              IconButton(
                icon: const Icon(Icons.upgrade, color: MediarrColors.textSecondary, size: 18),
                onPressed: onQualityUpgrade,
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
              ),
              const SizedBox(width: 4),
            ],
            // Play button
            if (episode.hasFile)
              const Icon(Icons.play_arrow,
                  color: MediarrColors.accentPrimary, size: 20)
            else if (episode.isDownloading)
              const SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: MediarrColors.statusInfo,
                ),
              ),
          ],
        ),
      ),
    );
  }

  String _formatAirDate(String isoDate) {
    try {
      final dt = DateTime.parse(isoDate);
      return '${dt.year}-${dt.month.toString().padLeft(2, '0')}-${dt.day.toString().padLeft(2, '0')}';
    } catch (_) {
      return isoDate;
    }
  }
}

class _MetadataChip extends StatelessWidget {
  const _MetadataChip({required this.label, this.color});
  final String label;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color:
            (color ?? MediarrColors.textMuted).withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(
          color:
              (color ?? MediarrColors.textMuted).withValues(alpha: 0.3),
        ),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color ?? MediarrColors.textSecondary,
          fontSize: 13,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }
}
