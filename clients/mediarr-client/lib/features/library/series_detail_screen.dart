import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/mediarr_theme.dart';
import '../../core/widgets/focusable_card.dart';
import '../../shared/models/episode.dart';
import '../../shared/models/season.dart';
import '../../shared/models/series.dart';
import '../../shared/services/api_client.dart';
import '../playback/playback_screen.dart';

/// Provider for seasons of a series.
final seasonsProvider =
    FutureProvider.family<List<Season>, int>((ref, seriesId) async {
  final client = ref.read(apiClientProvider.notifier);
  return client.getSeasons(seriesId);
});

/// Provider for episodes of a series, optionally filtered by season.
final episodesProvider = FutureProvider.family<List<Episode>, ({int seriesId, int? seasonNumber})>(
  (ref, params) async {
    final client = ref.read(apiClientProvider.notifier);
    return client.getEpisodes(params.seriesId, seasonNumber: params.seasonNumber);
  },
);

/// Series detail view showing metadata, seasons, and episodes.
class SeriesDetailScreen extends ConsumerStatefulWidget {
  const SeriesDetailScreen({super.key, required this.series});

  final Series series;

  @override
  ConsumerState<SeriesDetailScreen> createState() => _SeriesDetailScreenState();
}

class _SeriesDetailScreenState extends ConsumerState<SeriesDetailScreen> {
  int? _selectedSeason;

  @override
  Widget build(BuildContext context) {
    final seasonsAsync = ref.watch(seasonsProvider(widget.series.id));
    final episodesAsync = ref.watch(episodesProvider((
      seriesId: widget.series.id,
      seasonNumber: _selectedSeason,
    )));

    return Scaffold(
      body: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Poster sidebar
          SizedBox(
            width: 280,
            child: Column(
              children: [
                // Poster
                Expanded(
                  flex: 3,
                  child: widget.series.posterUrl != null
                      ? CachedNetworkImage(
                          imageUrl: widget.series.posterUrl!,
                          fit: BoxFit.cover,
                          width: double.infinity,
                        )
                      : Container(
                          color: MediarrColors.surfaceHover,
                          child: const Center(
                            child: Icon(Icons.tv, size: 80,
                                color: MediarrColors.textMuted),
                          ),
                        ),
                ),
                // Season list
                Expanded(
                  flex: 2,
                  child: seasonsAsync.when(
                    loading: () => const Center(
                      child: CircularProgressIndicator(
                        color: MediarrColors.accentPrimary,
                      ),
                    ),
                    error: (e, _) => Center(child: Text('Error: $e')),
                    data: (seasons) => ListView.builder(
                      itemCount: seasons.length,
                      itemBuilder: (context, index) {
                        final season = seasons[index];
                        final isSelected =
                            _selectedSeason == season.seasonNumber;
                        return FocusableCard(
                          onPressed: () {
                            setState(() {
                              _selectedSeason = isSelected
                                  ? null
                                  : season.seasonNumber;
                            });
                          },
                          child: ListTile(
                            dense: true,
                            selected: isSelected,
                            selectedTileColor: MediarrColors.accentPrimary
                                .withValues(alpha: 0.1),
                            title: Text(
                              season.seasonNumber == 0
                                  ? 'Specials'
                                  : 'Season ${season.seasonNumber}',
                              style: TextStyle(
                                color: isSelected
                                    ? MediarrColors.accentPrimary
                                    : MediarrColors.textPrimary,
                                fontWeight: isSelected
                                    ? FontWeight.bold
                                    : FontWeight.normal,
                              ),
                            ),
                            subtitle: Text(
                              '${season.episodeFileCount ?? 0}/${season.episodeCount ?? 0} episodes',
                              style: const TextStyle(
                                color: MediarrColors.textMuted,
                                fontSize: 12,
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                ),
              ],
            ),
          ),
          // Main content
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(32),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header
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
                          widget.series.title,
                          style: Theme.of(context).textTheme.headlineLarge,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  // Metadata chips
                  Wrap(
                    spacing: 8,
                    children: [
                      if (widget.series.year != null)
                        Chip(label: Text('${widget.series.year}')),
                      if (widget.series.network != null)
                        Chip(label: Text(widget.series.network!)),
                      if (widget.series.status != null)
                        Chip(label: Text(widget.series.status!)),
                      Chip(
                        label: Text(
                          '${widget.series.episodeFileCount ?? 0}/${widget.series.episodeCount ?? 0} episodes',
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  // Overview
                  if (widget.series.overview != null) ...[
                    Text(widget.series.overview!,
                        style: Theme.of(context).textTheme.bodyLarge),
                    const SizedBox(height: 24),
                  ],
                  // Episode list
                  Text(
                    _selectedSeason != null
                        ? 'Season $_selectedSeason Episodes'
                        : 'All Episodes',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 12),
                  episodesAsync.when(
                    loading: () => const Center(
                      child: Padding(
                        padding: EdgeInsets.all(32),
                        child: CircularProgressIndicator(
                          color: MediarrColors.accentPrimary,
                        ),
                      ),
                    ),
                    error: (e, _) => Text('Error loading episodes: $e'),
                    data: (episodes) => episodes.isEmpty
                        ? const Text(
                            'No episodes found',
                            style: TextStyle(color: MediarrColors.textMuted),
                          )
                        : Column(
                            children: episodes.map((ep) {
                              return _EpisodeRow(
                                episode: ep,
                                seriesTitle: widget.series.title,
                                onPlay: ep.hasFile && ep.path != null
                                    ? () {
                                        final apiClient = ref.read(
                                            apiClientProvider.notifier);
                                        final streamUrl =
                                            apiClient.getStreamUrl(ep.path!);
                                        Navigator.of(context).push(
                                          MaterialPageRoute(
                                            builder: (_) => PlaybackScreen(
                                              streamUrl: streamUrl,
                                              title:
                                                  '${widget.series.title} - S${ep.seasonNumber.toString().padLeft(2, '0')}E${ep.episodeNumber.toString().padLeft(2, '0')}',
                                              mediaId: ep.id,
                                              mediaType: 'episode',
                                            ),
                                          ),
                                        );
                                      }
                                    : null,
                              );
                            }).toList(),
                          ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _EpisodeRow extends StatelessWidget {
  const _EpisodeRow({
    required this.episode,
    required this.seriesTitle,
    this.onPlay,
  });
  final Episode episode;
  final String seriesTitle;
  final VoidCallback? onPlay;

  @override
  Widget build(BuildContext context) {
    return FocusableCard(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          children: [
            // Episode number
            SizedBox(
              width: 60,
              child: Text(
                'S${episode.seasonNumber.toString().padLeft(2, '0')}E${episode.episodeNumber.toString().padLeft(2, '0')}',
                style: const TextStyle(
                  color: MediarrColors.accentPrimary,
                  fontWeight: FontWeight.bold,
                  fontSize: 13,
                ),
              ),
            ),
            // Title
            Expanded(
              child: Text(
                episode.title ?? 'Episode ${episode.episodeNumber}',
                style: const TextStyle(
                  color: MediarrColors.textPrimary,
                  fontSize: 14,
                ),
              ),
            ),
            // Air date
            if (episode.airDateUtc != null)
              Padding(
                padding: const EdgeInsets.only(right: 12),
                child: Text(
                  episode.airDateUtc!.substring(0, 10),
                  style: const TextStyle(
                    color: MediarrColors.textMuted,
                    fontSize: 12,
                  ),
                ),
              ),
            // Quality badge
            if (episode.quality != null)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: MediarrColors.accentPrimary.withValues(alpha: 0.2),
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
            // Play button
            if (onPlay != null)
              IconButton(
                icon: const Icon(
                  Icons.play_arrow,
                  color: MediarrColors.accentPrimary,
                  size: 20,
                ),
                onPressed: onPlay,
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
              ),
            const SizedBox(width: 8),
            // Status dot
            Container(
              width: 10,
              height: 10,
              decoration: BoxDecoration(
                color: episode.hasFile
                    ? MediarrColors.statusSuccess
                    : episode.monitored
                        ? MediarrColors.statusWarning
                        : MediarrColors.textMuted,
                shape: BoxShape.circle,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
